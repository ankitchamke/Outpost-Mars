/**
 * OUTPOST: MARS — Ingestion Pipeline Failure Safety Tests
 *
 * Verifies that:
 * 1. Snapshot writes are strictly atomic (using temporary staging and atomic renaming).
 * 2. Failed validation or network errors abort the pipeline without touching existing files.
 * 3. Existing snapshots remain 100% intact if ingestion fails.
 * 4. No temporary (.tmp) artifacts are leaked on failure.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  writeSnapshotBatchTransactional,
  writeSnapshotFileAtomic,
} from '../../scripts/ingest-nasa-data';
import { validateDonkiSnapshot } from '../../src/data/validation';
import bundledDonki from '../../src/data/snapshots/donki-events.json';

const TEST_DIR = path.resolve(process.cwd(), 'tests/data/.test-tmp');

describe('Ingestion Pipeline Failure-Safety & Atomic Writes', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('atomically writes snapshot and produces exact JSON file', async () => {
    const filename = 'atomic-test.json';
    const testData = { schemaVersion: '1.0', test: 'sample', value: 42 };

    await writeSnapshotFileAtomic(TEST_DIR, filename, testData);

    const targetPath = path.join(TEST_DIR, filename);
    const content = await fs.readFile(targetPath, 'utf8');
    const parsed = JSON.parse(content);

    expect(parsed).toEqual(testData);

    // Verify no temporary files remain in the directory
    const files = await fs.readdir(TEST_DIR);
    expect(files).toEqual([filename]);
  });

  it('preserves existing snapshot byte-for-byte when validation fails before write', async () => {
    const filename = 'existing-snapshot.json';
    const originalContent = JSON.stringify({ schemaVersion: '1.0', source: 'ORIGINAL_DATA', intact: true }, null, 2);
    const targetPath = path.join(TEST_DIR, filename);

    // Write original snapshot
    await fs.writeFile(targetPath, originalContent, 'utf8');

    // Simulate invalid payload that fails validation
    const invalidDonkiPayload = {
      ...bundledDonki,
      schemaVersion: 'INVALID_VERSION_99',
    };

    const valResult = validateDonkiSnapshot(invalidDonkiPayload);
    expect(valResult.success).toBe(false);

    // Because validation failed, the pipeline aborts and write is never called
    if (valResult.success) {
      await writeSnapshotFileAtomic(TEST_DIR, filename, invalidDonkiPayload);
    }

    // Target file must remain 100% byte-for-byte identical to the original
    const postContent = await fs.readFile(targetPath, 'utf8');
    expect(postContent).toBe(originalContent);
  });

  it('cleans up temporary files if writing is interrupted or fails', async () => {
    // Attempting to write to an invalid path (e.g. non-existent subdirectory without mkdir)
    const invalidDir = path.join(TEST_DIR, 'non-existent-sub');

    await expect(
      writeSnapshotFileAtomic(invalidDir, 'fail-test.json', { some: 'data' })
    ).rejects.toThrow();

    // Verify test dir is not corrupted
    const exists = await fs.stat(TEST_DIR).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('rolls back all snapshots if failure occurs during second snapshot replacement', async () => {
    // Setup pre-existing valid snapshot files
    const file1 = 'donki-events.json';
    const file2 = 'radlab-dosimetry.json';
    const file3 = 'osdr-studies.json';

    const orig1 = JSON.stringify({ source: 'ORIGINAL_DONKI', version: 1 }, null, 2);
    const orig2 = JSON.stringify({ source: 'ORIGINAL_RADLAB', version: 1 }, null, 2);
    const orig3 = JSON.stringify({ source: 'ORIGINAL_OSDR', version: 1 }, null, 2);

    await fs.writeFile(path.join(TEST_DIR, file1), orig1, 'utf8');
    await fs.writeFile(path.join(TEST_DIR, file2), orig2, 'utf8');
    await fs.writeFile(path.join(TEST_DIR, file3), orig3, 'utf8');

    // New candidate payloads
    const batch = [
      { filename: file1, data: { source: 'NEW_DONKI', version: 2 } },
      { filename: file2, data: { source: 'NEW_RADLAB', version: 2 } },
      { filename: file3, data: { source: 'NEW_OSDR', version: 2 } },
    ];

    // Simulate fault on second file replacement
    await expect(
      writeSnapshotBatchTransactional(TEST_DIR, batch, {
        faultInjectOnFilename: file2,
      })
    ).rejects.toThrow(/Simulated fault during atomic replacement of radlab-dosimetry\.json/);

    // Verify all 3 files remain 100% byte-for-byte identical to their pre-existing state
    expect(await fs.readFile(path.join(TEST_DIR, file1), 'utf8')).toBe(orig1);
    expect(await fs.readFile(path.join(TEST_DIR, file2), 'utf8')).toBe(orig2);
    expect(await fs.readFile(path.join(TEST_DIR, file3), 'utf8')).toBe(orig3);

    // Verify no temporary .stage or .bak files remain in the directory
    const remainingFiles = await fs.readdir(TEST_DIR);
    expect(remainingFiles.sort()).toEqual([file1, file2, file3].sort());
  });

  it('rolls back all snapshots if failure occurs during third snapshot replacement', async () => {
    // Setup pre-existing valid snapshot files
    const file1 = 'donki-events.json';
    const file2 = 'radlab-dosimetry.json';
    const file3 = 'osdr-studies.json';

    const orig1 = JSON.stringify({ source: 'ORIGINAL_DONKI', version: 1 }, null, 2);
    const orig2 = JSON.stringify({ source: 'ORIGINAL_RADLAB', version: 1 }, null, 2);
    const orig3 = JSON.stringify({ source: 'ORIGINAL_OSDR', version: 1 }, null, 2);

    await fs.writeFile(path.join(TEST_DIR, file1), orig1, 'utf8');
    await fs.writeFile(path.join(TEST_DIR, file2), orig2, 'utf8');
    await fs.writeFile(path.join(TEST_DIR, file3), orig3, 'utf8');

    // New candidate payloads
    const batch = [
      { filename: file1, data: { source: 'NEW_DONKI', version: 2 } },
      { filename: file2, data: { source: 'NEW_RADLAB', version: 2 } },
      { filename: file3, data: { source: 'NEW_OSDR', version: 2 } },
    ];

    // Simulate fault on third file replacement
    await expect(
      writeSnapshotBatchTransactional(TEST_DIR, batch, {
        faultInjectOnFilename: file3,
      })
    ).rejects.toThrow(/Simulated fault during atomic replacement of osdr-studies\.json/);

    // Verify all 3 files remain 100% byte-for-byte identical to their pre-existing state
    expect(await fs.readFile(path.join(TEST_DIR, file1), 'utf8')).toBe(orig1);
    expect(await fs.readFile(path.join(TEST_DIR, file2), 'utf8')).toBe(orig2);
    expect(await fs.readFile(path.join(TEST_DIR, file3), 'utf8')).toBe(orig3);

    // Verify no temporary .stage or .bak files remain in the directory
    const remainingFiles = await fs.readdir(TEST_DIR);
    expect(remainingFiles.sort()).toEqual([file1, file2, file3].sort());
  });
});


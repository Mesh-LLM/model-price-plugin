"""Offline archive contract tests; no services or credentials."""
import hashlib
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
import release


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'dist').mkdir()
        (self.root / 'Cargo.toml').write_text('[package]\nversion="0.1.0"\n')
        (self.root / 'plugin.toml').write_text('name="model-prices"\nversion="0.1.0"\n')

    def archive(self, omit=None):
        target = 'aarch64-apple-darwin'
        archive = self.root / 'dist' / f'model-prices-v0.1.0-{target}.tar.gz'
        files = ['model-prices', 'LICENSE', 'NOTICE', 'plugin-manifest.json',
                 'plugin.toml'] + ['bundle/' + n for n in (
                     'register-mesh-plugin-ui.js', 'model-offers.js',
                     'references.js', 'model-matching.js')]
        with tarfile.open(archive, 'w:gz') as tar:
            for name in files:
                if name == omit:
                    continue
                data = ((self.root / name).read_bytes() if name == 'plugin.toml'
                        else b'fixture')
                entry = tarfile.TarInfo('model-prices/' + name)
                entry.size = len(data)
                entry.mode = 0o755
                tar.addfile(entry, io.BytesIO(data))
        sidecar = archive.with_name(archive.name + '.sha256')
        sidecar.write_text(f'{hashlib.sha256(archive.read_bytes()).hexdigest()}  {archive.name}\n')
        return target, sidecar

    def test_complete_archive(self):
        target, _ = self.archive()
        self.assertEqual(len(release.verify(self.root, [target])), 2)

    def test_corrupt_checksum(self):
        target, sidecar = self.archive()
        sidecar.write_text('bad')
        with self.assertRaises(ValueError):
            release.verify(self.root, [target])

    def test_missing_ui(self):
        target, _ = self.archive('bundle/references.js')
        with self.assertRaises(ValueError):
            release.verify(self.root, [target])

    def test_version_mismatch(self):
        (self.root / 'plugin.toml').write_text('version="0.2.0"')
        with self.assertRaises(ValueError):
            release.version(self.root)

    def test_target_rejected(self):
        with self.assertRaises(ValueError):
            release.verify(self.root, ['unsupported'])

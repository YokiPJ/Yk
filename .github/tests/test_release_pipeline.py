"""Exercise release channels, exact upload/download IDs and preparation offline.

All subprocesses are replaced by a stateful fake: no network, credentials,
actual Git changes or real release publication are used by these tests.
"""
from contextlib import contextmanager, redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch
import hashlib
import io
import json
import os
import runpy
import shutil
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / '.github/scripts'
sys.path.insert(0, str(SCRIPTS))
from release_policy import publication_policy

SOURCE = 'a' * 40
REPOSITORY = 'YokiPJ/Yk'
ARTIFACT = b'Offline fixture APK bytes, not an installable game'


@contextmanager
def working_directory(path):
    previous = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(previous)


class FakeGitHub:
    def __init__(self, tag, *, wrong_published_channel=False, wrong_tag=False):
        self.tag = tag
        self.current = None
        self.calls = []
        self.payloads = []
        self.wrong_published_channel = wrong_published_channel
        self.wrong_tag = wrong_tag
        self.asset_bytes = {}

    def __call__(self, args, **kwargs):
        args = list(args)
        self.calls.append(list(args))
        def result(value=None, code=0, error=''):
            return SimpleNamespace(returncode=code, stderr=error,
                                   stdout=json.dumps(value) if value is not None else '')
        if args[0] == 'git':
            return result(code=1 if args[1:4] == ['diff', '--cached', '--quiet'] else 0)
        if args[:2] != ['gh', 'api']:
            raise AssertionError('Unexpected command: ' + repr(args))
        method = args[args.index('--method') + 1] if '--method' in args else 'GET'
        endpoint = args[4] if '--method' in args else args[2]
        payload = None
        if '--input' in args:
            input_path = Path(args[args.index('--input') + 1])
            if endpoint.startswith('https://uploads.github.com/'):
                self.asset_bytes[201] = input_path.read_bytes()
                asset = {'id': 201, 'name': input_path.name,
                         'size': len(self.asset_bytes[201]),
                         'browser_download_url': 'https://github.com/' + REPOSITORY
                             + '/releases/download/' + self.tag + '/' + input_path.name}
                self.current['assets'].append(asset)
                return result(asset)
            payload = json.loads(input_path.read_text())
            self.payloads.append((method, endpoint, payload))
        if endpoint.endswith('/git/commits/' + SOURCE):
            return result({'sha': SOURCE})
        if endpoint.endswith('/git/ref/tags/' + self.tag):
            return result({'object': {'type': 'commit', 'sha': 'b' * 40 if self.wrong_tag else SOURCE}})
        if endpoint.endswith('/releases?per_page=100'):
            return result([])
        if endpoint == f'repos/{REPOSITORY}/releases' and method == 'POST':
            self.current = {**payload, 'id': 101, 'assets': [],
                            'upload_url': f'https://uploads.github.com/repos/{REPOSITORY}/releases/101/assets{{?name,label}}',
                            'html_url': f'https://github.com/{REPOSITORY}/releases/tag/{self.tag}'}
            return result(self.current)
        if endpoint == f'repos/{REPOSITORY}/releases/101':
            if method == 'PATCH':
                self.current.update(payload)
                if self.wrong_published_channel and not self.current['draft']:
                    self.current['prerelease'] = not self.current['prerelease']
            return result(self.current)
        if endpoint == f'repos/{REPOSITORY}/releases/assets/201':
            self.assert_binary_download(args, kwargs)
            kwargs['stdout'].write(self.asset_bytes[201])
            return result()
        raise AssertionError('Unexpected GitHub request: ' + repr(args))

    @staticmethod
    def assert_binary_download(args, kwargs):
        if 'Accept: application/octet-stream' not in args or 'stdout' not in kwargs:
            raise AssertionError('An uploaded asset must be downloaded as bytes by ID')


class ReleasePolicyTests(unittest.TestCase):
    def test_stable_and_beta_channels(self):
        self.assertEqual(publication_policy('v1.2.3'), {'prerelease': False, 'make_latest': 'true'})
        for tag in ['v1.3.0-beta.1', 'v0.0.0-beta.0', 'v12.34.56-beta.10']:
            with self.subTest(tag=tag):
                self.assertEqual(publication_policy(tag, True), {'prerelease': True, 'make_latest': 'false'})

    def test_invalid_tags_and_channels_fail_before_publication(self):
        for tag in [None, '', '1.3.0-beta.1', 'v01.3.0', 'v1.3.0-beta.01',
                    'v1.3.0-beta', 'v1.3.0-rc.1', 'v1.3.0-beta.1/other',
                    'v1.3.0-beta.1\n', 'v1.3.0+build', 'v1.3.0-beta.١']:
            with self.subTest(tag=tag), self.assertRaises(RuntimeError):
                publication_policy(tag, True)
        for tag, flag in [('v1.3.0-beta.1', False), ('v1.3.0', True),
                          ('v1.3.0', 'false'), ('v1.3.0', 0), ('v1.3.0', None)]:
            with self.subTest(tag=tag, flag=flag), self.assertRaises(RuntimeError):
                publication_policy(tag, flag)


class PublisherTests(unittest.TestCase):
    def exercise(self, tag, beta, **fake_options):
        with TemporaryDirectory() as temporary:
            folder = Path(temporary)
            artifact = folder / 'fixture.apk'
            artifact.write_bytes(ARTIFACT)
            digest = hashlib.sha256(ARTIFACT).hexdigest()
            manifest = {'schemaVersion': 1, 'repository': REPOSITORY, 'tag': tag,
                        'source_commit': SOURCE, 'title': 'Offline test', 'prerelease': beta,
                        'assets': [{'name': artifact.name, 'bytes': len(ARTIFACT), 'sha256': digest}]}
            (folder / 'release-manifest.json').write_text(json.dumps(manifest))
            (folder / 'RELEASE_NOTES.md').write_text(f'Notes\n<!-- hinaria-release:{tag}:{SOURCE} -->\n')
            fake = FakeGitHub(tag, **fake_options)
            environment = {'GITHUB_REPOSITORY': REPOSITORY, 'GITHUB_REF_NAME': 'releases/' + tag,
                           'GITHUB_RUN_ID': 'offline-test'}
            error = None
            with working_directory(folder), patch.dict(os.environ, environment, clear=True), patch('subprocess.run', fake), redirect_stdout(io.StringIO()):
                try:
                    runpy.run_path(str(SCRIPTS / 'publish-release.py'), run_name='__main__')
                except RuntimeError as caught:
                    error = caught
            proof = json.loads((folder / 'release-proof.json').read_text())
            return fake, proof, error

    def test_beta_publishes_by_ids_without_replacing_latest_stable(self):
        fake, proof, error = self.exercise('v1.3.0-beta.1', True)
        self.assertIsNone(error)
        self.assertEqual(proof['status'], 'published')
        self.assertIs(proof['prerelease'], True)
        self.assertEqual(proof['make_latest_requested'], 'false')
        creation, publication = fake.payloads
        self.assertIs(creation[2]['prerelease'], True)
        self.assertEqual(publication, ('PATCH', f'repos/{REPOSITORY}/releases/101',
                                     {'draft': False, 'prerelease': True, 'make_latest': 'false'}))
        self.assertTrue(any(f'repos/{REPOSITORY}/releases/assets/201' in call for call in fake.calls))
        self.assertEqual(proof['assets'][0]['sha256'], hashlib.sha256(ARTIFACT).hexdigest())

    def test_stable_publication_keeps_existing_latest_behavior(self):
        fake, proof, error = self.exercise('v1.2.3', False)
        self.assertIsNone(error)
        self.assertIs(proof['prerelease'], False)
        self.assertEqual(fake.payloads[-1][2], {'draft': False, 'prerelease': False, 'make_latest': 'true'})

    def test_remote_channel_mismatch_is_never_confirmed(self):
        _, proof, error = self.exercise('v1.3.0-beta.1', True, wrong_published_channel=True)
        self.assertIsNotNone(error)
        self.assertEqual(proof['status'], 'failed')
        self.assertEqual(proof['stage'], 'publish by release ID')
        self.assertIn('não confirmada', proof['error'])

    def test_existing_tag_with_other_source_is_preserved(self):
        fake, proof, error = self.exercise('v1.3.0-beta.1', True, wrong_tag=True)
        self.assertIsNotNone(error)
        self.assertEqual(proof['status'], 'failed')
        self.assertEqual(fake.payloads, [], 'conflicting tag must stop every remote mutation')


class PreparationTests(unittest.TestCase):
    def test_beta_flag_source_commit_and_policy_are_delivered(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            game = root / 'hinaria'
            release = {'version': '1.3.0-beta.1', 'tag': 'v1.3.0-beta.1', 'prerelease': True,
                       'repository': REPOSITORY, 'title': 'Offline beta', 'apk': 'fixture.apk'}
            for name, contents in {
                'release.json': json.dumps(release).encode(), 'downloads/fixture.apk': ARTIFACT,
                'downloads/HinariaMotion.jar': b'fixture JAR',
                'docs/releases/1.3.0-beta.1/RELEASE_NOTES.md': b'Beta notes',
                'docs/qa/1.3.0-beta.1/results.json': b'{"status":"PASS"}',
                'studio/scenery/01-village.png': b'fixture PNG',
            }.items():
                path = game / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(contents)
            preparer = game / 'tools/prepare-release.py'
            preparer.parent.mkdir(parents=True)
            shutil.copy2(ROOT / 'hinaria/tools/prepare-release.py', preparer)
            for name in ['.github/workflows/publish-release.yml', '.github/scripts/publish-release.py',
                         '.github/scripts/release_policy.py']:
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / name, target)
            calls = []
            def command(args, **kwargs):
                calls.append(args)
                self.assertEqual(kwargs['cwd'], root)
                output = SOURCE if args == ('git', 'rev-parse', 'HEAD') else ''
                if args[:2] == ('git', 'archive'):
                    self.assertEqual(args[-1], SOURCE, 'source ZIP uses exact committed tree')
                    Path(next(arg[len('--output='):] for arg in args if arg.startswith('--output='))).write_bytes(b'fixture archive')
                return SimpleNamespace(stdout=output, returncode=0)
            with patch('subprocess.run', command), patch.object(sys, 'argv', [str(preparer)]), redirect_stdout(io.StringIO()):
                runpy.run_path(str(preparer), run_name='__main__')
            target = root / 'dist/v1.3.0-beta.1'
            manifest = json.loads((target / 'release-manifest.json').read_text())
            self.assertIs(manifest['prerelease'], True)
            self.assertEqual(manifest['source_commit'], SOURCE)
            self.assertEqual((target / '.github/scripts/release_policy.py').read_bytes(), (SCRIPTS / 'release_policy.py').read_bytes())
            self.assertIn(f'<!-- hinaria-release:v1.3.0-beta.1:{SOURCE} -->', (target / 'RELEASE_NOTES.md').read_text())
            for asset in manifest['assets']:
                data = (target / asset['name']).read_bytes()
                self.assertEqual(asset['bytes'], len(data))
                self.assertEqual(asset['sha256'], hashlib.sha256(data).hexdigest())
            self.assertIn(('git', 'status', '--porcelain'), calls, 'delivery starts from a clean source tree')
            self.assertFalse(any(call[:2] in [('git', 'init'), ('git', 'push')] for call in calls))


if __name__ == '__main__':
    unittest.main()

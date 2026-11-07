"""Shared validation and GitHub publication flags for stable/beta releases."""
import re

_NUMBER = r'(?:0|[1-9][0-9]*)'
_TAG = re.compile(r'v' + _NUMBER + r'\.' + _NUMBER + r'\.' + _NUMBER
                  + r'(?P<beta>-beta\.' + _NUMBER + r')?')


def publication_policy(tag, prerelease=False):
    """Reject inconsistent channels before any remote mutation is attempted."""
    match = _TAG.fullmatch(tag) if isinstance(tag, str) else None
    if match is None:
        raise RuntimeError('Tag inválida: use vX.Y.Z ou vX.Y.Z-beta.N, sem zeros à esquerda.')
    if type(prerelease) is not bool:
        raise RuntimeError('O indicador prerelease precisa ser booleano.')
    beta = match.group('beta') is not None
    if prerelease != beta:
        raise RuntimeError('A tag beta e o indicador prerelease precisam corresponder.')
    return {'prerelease': beta, 'make_latest': 'false' if beta else 'true'}

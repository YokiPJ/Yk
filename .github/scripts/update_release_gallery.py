"""Append a real screenshot gallery to the existing release without replacing its builds."""
from pathlib import Path
import hashlib,json,os,subprocess,tempfile,shutil,html
from html.parser import HTMLParser
from urllib.parse import urlparse
REPO='yorimiguel727-eng/Yk';TAG='v1.2.0';BRANCH='hinaria-downloads-v1.2.0'
START='<!-- HINARIA_GALLERY_V1_START -->';END='<!-- HINARIA_GALLERY_V1_END -->'
stage='initialize'
def run(*args):
 r=subprocess.run(args,capture_output=True,text=True)
 if r.returncode:raise RuntimeError(args[0]+' failed: '+r.stderr[-1200:])
 return r.stdout

def checksum(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()

def release():return json.loads(run('gh','api',f'repos/{REPO}/releases/tags/{TAG}'))
def record(proof):
 Path('release-gallery-proof.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
 run('git','config','user.name','github-actions[bot]');run('git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
 run('git','add','release-gallery-proof.json')
 r=subprocess.run(['git','diff','--cached','--quiet'])
 if r.returncode:
  run('git','commit','-m','Registra publicação da galeria HINÁRIA v1.2.0');run('git','push','origin',f'HEAD:refs/heads/{BRANCH}')
class Images(HTMLParser):
 def __init__(self):super().__init__();self.sources=[]
 def handle_starttag(self,tag,attrs):
  if tag=='img':self.sources.append(dict(attrs).get('src',''))
try:
 if os.environ.get('GITHUB_REPOSITORY')!=REPO:raise RuntimeError('Unexpected repository')
 stage='validate screenshots'
 manifest=json.loads(Path('media/releases/v1.2.0/gallery.json').read_text());images=manifest['images']
 if len(images)!=6:raise RuntimeError('Expected six real game screenshots')
 for image in images:
  path=Path(image['path'])
  if not path.is_file() or checksum(path)!=image['sha256'] or path.read_bytes()[:8]!=b'\x89PNG\r\n\x1a\n':raise RuntimeError('Invalid screenshot: '+str(path))
 current=release()
 if current['draft']:raise RuntimeError('Expected the already published release')
 preserved={a['name']:(a['id'],a['size']) for a in current['assets'] if a['name'] in ('HINARIA_UPGRADE_1.2.0.zip','HINARIA_UPGRADE_DEBUG_1.2.0.apk')}
 if len(preserved)!=2:raise RuntimeError('The existing ZIP/APK could not be confirmed')
 stage='upload screenshot assets'
 with tempfile.TemporaryDirectory(prefix='hinaria-gallery-') as temp:
  upload=Path(temp)/'upload';download=Path(temp)/'download';upload.mkdir();download.mkdir()
  paths=[]
  for image in images:
   p=upload/image['asset'];shutil.copyfile(image['path'],p);paths.append(str(p))
  run('gh','release','upload',TAG,*paths,'--repo',REPO,'--clobber')
  stage='verify uploaded screenshot bytes'
  run('gh','release','download',TAG,'--repo',REPO,'--dir',str(download),'--pattern','HINARIA_*.png')
  for image in images:
   if checksum(download/image['asset'])!=image['sha256']:raise RuntimeError('Uploaded screenshot mismatch: '+image['asset'])
 current=release();assets={a['name']:a for a in current['assets']}
 block=[START,'## Imagens do jogo','Capturas reais da build **HINÁRIA 1.2.0**. O layout mobile foi emulado no navegador; não representa teste em telefone.','']
 for image in images:
  src=f"https://github.com/{REPO}/raw/{os.environ['GITHUB_SHA']}/{image['path']}"
  width=300 if image['width']<image['height'] else 960
  block.extend(['### '+image['title'],f'<img src="{src}" alt="{html.escape(image["caption"],quote=True)}" width="{width}">',image['caption'],f'[Abrir ou baixar esta imagem]({assets[image["asset"]]["browser_download_url"]})',''])
 block.append(END);gallery='\n\n'.join(block)
 stage='check rendered gallery markup'
 payload={'text':gallery,'mode':'gfm','context':REPO}
 Path('/tmp/hinaria-gallery-markdown.json').write_text(json.dumps(payload))
 rendered=run('gh','api','markdown','--method','POST','--input','/tmp/hinaria-gallery-markdown.json')
 parsed=Images();parsed.feed(rendered)
 if len(parsed.sources)!=len(images) or any(not source for source in parsed.sources):raise RuntimeError('GitHub did not render all six image elements')
 body=current.get('body') or ''
 if (START in body)!=(END in body):raise RuntimeError('Incomplete gallery markers in existing notes; notes preserved')
 if START in body:body=body[:body.index(START)]+gallery+body[body.index(END)+len(END):]
 else:body=body.rstrip()+'\n\n'+gallery+'\n'
 stage='update release notes'
 Path('/tmp/hinaria-gallery-edit.json').write_text(json.dumps({'body':body}))
 run('gh','api',f'repos/{REPO}/releases/{current["id"]}','--method','PATCH','--input','/tmp/hinaria-gallery-edit.json')
 after=release();after_assets={a['name']:a for a in after['assets']}
 if after['draft'] or START not in after['body'] or END not in after['body']:raise RuntimeError('Updated published notes were not confirmed')
 for name,identity in preserved.items():
  a=after_assets[name]
  if (a['id'],a['size'])!=identity:raise RuntimeError('The original build asset changed unexpectedly')
 proof={'status':'published','release_url':after['html_url'],'image_count':len(images),'rendered_img_elements':len(parsed.sources),
  'rendered_image_hosts':sorted({urlparse(source).hostname for source in parsed.sources}),
  'gallery_commit':os.environ['GITHUB_SHA'],'preserved_build_assets':list(preserved),
  'images':[{'name':i['asset'],'sha256':i['sha256'],'width':i['width'],'height':i['height'],'url':after_assets[i['asset']]['browser_download_url']} for i in images],
  'run_url':f"https://github.com/{REPO}/actions/runs/{os.environ.get('GITHUB_RUN_ID')}"}
 record(proof);print('Published six real screenshots and gallery: '+after['html_url'])
except Exception as error:
 try:record({'status':'failed','stage':stage,'error':str(error),'run_url':f"https://github.com/{REPO}/actions/runs/{os.environ.get('GITHUB_RUN_ID')}"})
 except Exception as e:print('Could not record gallery failure:',str(e))
 raise

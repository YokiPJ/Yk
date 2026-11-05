"""Publish a scenery-only gallery while preserving the existing release builds."""
from pathlib import Path
import hashlib,json,os,subprocess,tempfile,shutil,html
from html.parser import HTMLParser
from urllib.parse import urlparse
REPO='yorimiguel727-eng/Yk';TAG='v1.2.0';BRANCH='hinaria-downloads-v1.2.0'
START='<!-- HINARIA_GALLERY_V1_START -->';END='<!-- HINARIA_GALLERY_V1_END -->'
OBSOLETE=['HINARIA_TITULO.png','HINARIA_VILARRUBRA.png','HINARIA_HUD_MOBILE.png','HINARIA_INTERIOR.png','HINARIA_CURA_DRUIDA.png','HINARIA_MAGIA_CAJADO.png']
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
 if len(images)!=6 or images[0]['asset']!='HINARIA_CENARIO_VILARRUBRA.png':raise RuntimeError('Expected Vilarrubra first and six environment screenshots')
 if any(i['asset'] in OBSOLETE for i in images):raise RuntimeError('An obsolete character screenshot was selected')
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
 block=[START,'## Imagens do jogo','Vilarrubra em destaque e outros lugares de **HINÁRIA**. Capturas reais em câmera livre, com interface e personagens ocultos para destacar os cenários.','']
 for image in images:
  src=f"https://github.com/{REPO}/raw/{os.environ['GITHUB_SHA']}/{image['path']}"
  width=1280 if image is images[0] else 960
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
 if START in body:body=body[:body.index(START)]+body[body.index(END)+len(END):]
 body=gallery+'\n\n'+body.strip()+'\n'
 stage='update release notes'
 Path('/tmp/hinaria-gallery-edit.json').write_text(json.dumps({'body':body}))
 run('gh','api',f'repos/{REPO}/releases/{current["id"]}','--method','PATCH','--input','/tmp/hinaria-gallery-edit.json')
 stage='remove the obsolete character and UI screenshots'
 existing={a['name'] for a in release()['assets']}
 for obsolete in OBSOLETE:
  if obsolete in existing:run('gh','release','delete-asset',TAG,obsolete,'--repo',REPO,'--yes')
 after=release();after_assets={a['name']:a for a in after['assets']}
 if set(OBSOLETE).intersection(after_assets):raise RuntimeError('An obsolete screenshot remains attached')
 if any(old in after['body'] for old in OBSOLETE):raise RuntimeError('The notes still reference an obsolete screenshot')
 if after['draft'] or not after['body'].startswith(gallery) or END not in after['body']:raise RuntimeError('Updated published notes were not confirmed')
 if any(i['asset'] not in after_assets for i in images):raise RuntimeError('A new scenery screenshot is missing')
 for name,identity in preserved.items():
  a=after_assets[name]
  if (a['id'],a['size'])!=identity:raise RuntimeError('The original build asset changed unexpectedly')
 proof={'status':'published','release_url':after['html_url'],'image_count':len(images),'rendered_img_elements':len(parsed.sources),
  'rendered_image_hosts':sorted({urlparse(source).hostname for source in parsed.sources}),
  'gallery_commit':os.environ['GITHUB_SHA'],'preserved_build_assets':list(preserved),
  'main_image':images[0]['asset'],'removed_assets':OBSOLETE,'scenery_only':True,
  'images':[{'name':i['asset'],'sha256':i['sha256'],'width':i['width'],'height':i['height'],'url':after_assets[i['asset']]['browser_download_url']} for i in images],
  'run_url':f"https://github.com/{REPO}/actions/runs/{os.environ.get('GITHUB_RUN_ID')}"}
 record(proof);print('Published Vilarrubra-first scenery gallery and removed obsolete character screenshots: '+after['html_url'])
except Exception as error:
 try:record({'status':'failed','stage':stage,'error':str(error),'run_url':f"https://github.com/{REPO}/actions/runs/{os.environ.get('GITHUB_RUN_ID')}"})
 except Exception as e:print('Could not record gallery failure:',str(e))
 raise

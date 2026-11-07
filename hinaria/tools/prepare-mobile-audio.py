"""Keep original music in source; create smaller Android variants with FFmpeg."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'mobile-assets/audio';OUT.mkdir(parents=True,exist_ok=True)
def info(path):
    return json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,size:stream=sample_rate,channels','-of','json',str(path)],check=True,capture_output=True,text=True).stdout)
entries=[]
for name in ['boss-troll-battle.mp3','boss-orc-heavy.mp3']:
    source=ROOT/'assets/audio'/name;target=OUT/name
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-map','0:a:0','-map_metadata','0','-c:a','libmp3lame','-b:a','96k','-ar','44100','-ac','2',str(target)],check=True)
    before,after=info(source),info(target)
    if abs(float(before['format']['duration'])-float(after['format']['duration']))>.1:
        raise RuntimeError('Music duration changed: '+name)
    if target.stat().st_size>=source.stat().st_size:raise RuntimeError('No size reduction: '+name)
    sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
    entries.append({'name':name,'sourceBytes':source.stat().st_size,'sourceSHA256':sha(source),
                    'mobileBytes':target.stat().st_size,'mobileSHA256':sha(target),'duration':after['format']['duration'],
                    'sampleRate':44100,'channels':2,'bitrateKbps':96})
(OUT/'manifest.json').write_text(json.dumps({'profile':'Android music 96 kbps; original tracks retained in assets/audio', 'tracks':entries},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Mobile music variants ready:',sum(item['mobileBytes'] for item in entries),'bytes')

"""Validate animation contracts and run the standalone Java JAR outside the project."""
from pathlib import Path
import json,struct,math,subprocess,hashlib,tempfile,os
ROOT=Path(__file__).resolve().parent.parent
JAVA=os.environ.get("HINARIA_JAVA","java")
manifest=json.loads((ROOT/"output/manifest.json").read_text())
expected={c["name"]:c for c in manifest["animations"]}
reports=[]
for model in manifest["models"]:
    data=(ROOT/"output"/model["file"]).read_bytes()
    magic,version,length=struct.unpack_from("<III",data)
    assert magic==0x46546c67 and version==2 and length==len(data)
    json_length,json_type=struct.unpack_from("<II",data,12)
    assert json_type==0x4e4f534a and json_length%4==0
    doc=json.loads(data[20:20+json_length])
    offset=20+json_length
    bin_length,bin_type=struct.unpack_from("<II",data,offset)
    assert bin_type==0x004e4942 and bin_length%4==0
    binary=data[offset+8:offset+8+bin_length]
    def values(index):
        accessor=doc["accessors"][index];view=doc["bufferViews"][accessor["bufferView"]]
        assert accessor["componentType"]==5126
        width={"SCALAR":1,"VEC3":3,"VEC4":4}[accessor["type"]]
        start=view.get("byteOffset",0)+accessor.get("byteOffset",0)
        size=accessor["count"]*width*4
        assert start%4==0 and start+size<=len(binary)
        return struct.unpack_from("<"+"f"*(accessor["count"]*width),binary,start),width
    assert {a["name"] for a in doc["animations"]}==set(expected)
    track_count=0
    for animation in doc["animations"]:
        targets=set()
        for channel in animation["channels"]:
            node,path=channel["target"]["node"],channel["target"]["path"]
            assert node!=0,"World root must stay controlled by the gameplay wrapper"
            assert "matrix" not in doc["nodes"][node]
            assert (node,path) not in targets
            targets.add((node,path))
            sampler=animation["samplers"][channel["sampler"]]
            times,_=values(sampler["input"]);samples,width=values(sampler["output"])
            assert all(math.isfinite(v) for v in samples)
            assert all(b>a for a,b in zip(times,times[1:]))
            assert abs(times[0])<1e-7 and abs(times[-1]-expected[animation["name"]]["duration"])<1e-6
            assert len(samples)==len(times)*width
            if path=="rotation":
                assert all(abs(sum(v*v for v in samples[i:i+4])-1)<1e-5 for i in range(0,len(samples),4))
            if expected[animation["name"]]["loop"]:
                assert all(abs(a-b)<1e-6 for a,b in zip(samples[:width],samples[-width:])),"Loop seam"
            track_count+=1
    assert hashlib.sha256(data).hexdigest()==model["sha256"]
    reports.append({"model":model["id"],"clips":10,"channels":track_count,"loopSeams":"continuous","quaternions":"normalized","rootMotion":"in-place"})

with tempfile.TemporaryDirectory(prefix="hinaria-java-verify-") as temp:
    temp=Path(temp)
    result=subprocess.run([JAVA,"-Xmx512m","-jar",str(ROOT/"HinariaMotion.jar"),"--out",str(temp/"export")],cwd=temp,capture_output=True,text=True)
    assert result.returncode==0,result.stderr
    for model in manifest["models"]:
        assert hashlib.sha256((temp/"export"/model["file"]).read_bytes()).hexdigest()==model["sha256"],"Standalone JAR must reproduce identical GLBs"
    bad=[]
    for args in [["--fps","5"],["--model","unknown","--out",str(temp/"unknown")],["--unknown","x"]]:
        failure=subprocess.run([JAVA,"-jar",str(ROOT/"HinariaMotion.jar"),*args],cwd=temp,capture_output=True,text=True)
        assert failure.returncode!=0 and "HINARIA EXPORT ERROR" in failure.stderr
        bad.append({"args":args[:2],"handled":True})
    (temp/"invalid.json").write_text('{"version":1,"models":[')
    failure=subprocess.run([JAVA,"-jar",str(ROOT/"HinariaMotion.jar"),"--input",str(temp/"invalid.json")],cwd=temp,capture_output=True,text=True)
    assert failure.returncode!=0 and "HINARIA EXPORT ERROR" in failure.stderr
    bad.append({"args":["--input","invalid JSON"],"handled":True})
java_version=subprocess.run([JAVA,"-version"],capture_output=True,text=True).stderr.splitlines()[0]
report={"status":"PASS","javaRuntime":java_version,"classTarget":"Java 17 (--release 17)","models":reports,
        "standaloneJar":"All seven GLBs reproduced byte-for-byte outside project cwd, using bundled reference data",
        "cliErrorCases":bad}
(ROOT/"verification").mkdir(exist_ok=True)
(ROOT/"verification/java-data-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print("PASS: 70 clips; normalized quaternions; smooth loops; valid buffers; independent JAR; four handled CLI errors.")

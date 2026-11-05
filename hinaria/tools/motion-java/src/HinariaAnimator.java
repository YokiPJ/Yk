import java.io.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.GZIPInputStream;

/**
 * HINARIA Motion Java — actual game meshes + Java-generated glTF 2.0 tracks.
 * JDK 17+, standard library only. Rigid articulated nodes, not weighted skinning.
 */
public final class HinariaAnimator {
    private static final double TAU = Math.PI * 2;
    private static final List<Clip> CLIPS = List.of(
        new Clip("Idle", "Repouso", 2.8, true),
        new Clip("Walk", "Andar", .9, true),
        new Clip("Run", "Correr", .6, true),
        new Clip("Attack", "Ataque", .35, false),
        new Clip("AttackHeavy", "Ataque pesado", .6, false),
        new Clip("Hit", "Receber dano", .42, false),
        new Clip("Block", "Defender", .8, false),
        new Clip("Dodge", "Esquiva", .55, false),
        new Clip("Jump", "Salto", .9, false),
        new Clip("Death", "Morte", 1.1, false)
    );
    record Clip(String name, String label, double duration, boolean loop) {}
    record Options(Path input, Path output, String model, int fps) {}

    public static void main(String[] args) {
        try {
            if (Arrays.asList(args).contains("--help")) { help(); return; }
            Options options = options(args);
            String source;
            if (options.input != null) {
                try (InputStream raw = Files.newInputStream(options.input);
                     InputStream in = options.input.toString().endsWith(".gz") ? new GZIPInputStream(raw) : raw) {
                    source = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                }
            } else {
                InputStream bundled = HinariaAnimator.class.getResourceAsStream("/hinaria-rigs.json.gz");
                if (bundled == null) bundled = Files.newInputStream(Path.of("assets/hinaria-rigs.json.gz"));
                try (InputStream in = new GZIPInputStream(bundled)) {
                    source = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                }
            }
            Map<String,Object> document = map(Json.parse(source));
            if (integer(document.get("version")) != 1) throw new IllegalArgumentException("Snapshot version must be 1.");
            Files.createDirectories(options.output);
            List<Object> exported = new ArrayList<>();
            for (Object item : list(document.get("models"))) {
                Map<String,Object> model = map(item);
                String id = string(model.get("id"));
                if (!id.matches("[a-z][a-z0-9_-]*")) throw new IllegalArgumentException("Unsafe model identifier.");
                if (!options.model.equals("all") && !options.model.equals(id)) continue;
                Exporter exporter = new Exporter(model, options.fps);
                byte[] bytes = exporter.build();
                Path file = options.output.resolve(id + ".glb");
                atomicWrite(file, bytes);
                String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
                exported.add(obj("id", id, "name", model.get("name"), "file", id + ".glb",
                    "bytes", bytes.length, "sha256", hash, "primaryArm", model.get("primaryArm"),
                    "nodes", list(model.get("nodes")).size(), "meshes", list(model.get("meshes")).size(),
                    "removedDegenerateTriangles",exporter.discardedTriangles));
                System.out.printf(Locale.ROOT, "OK %-12s %,d bytes | %d clips | primary=%s%n",
                    id, bytes.length, CLIPS.size(), model.get("primaryArm"));
            }
            if (exported.isEmpty()) throw new IllegalArgumentException("Model not found: " + options.model);
            List<Object> animationInfo = new ArrayList<>();
            for (Clip c : CLIPS) {
                Map<String,Object> entry = obj("name",c.name,"label",c.label,"duration",c.duration,"loop",c.loop);
                if (c.name.startsWith("Attack")) entry.put("suggestedImpactTime",c.duration*.5);
                if (c.name.equals("Hit")) entry.put("initialImpactWindow",.18);
                animationInfo.add(entry);
            }
            Map<String,Object> manifest = obj("schemaVersion",1,"generator","HinariaAnimator.java",
                "format","glTF 2.0 GLB","fps",options.fps,"rootMotion","in-place; gameplay wrapper controls world movement",
                "rigKind","rigid node hierarchy, not vertex-weighted skinning","models",exported,"animations",animationInfo);
            atomicWrite(options.output.resolve("manifest.json"), Json.write(manifest).getBytes(StandardCharsets.UTF_8));
            System.out.println("Export complete: " + options.output.toAbsolutePath());
        } catch (Exception error) {
            System.err.println("HINARIA EXPORT ERROR: " + error.getMessage());
            System.exit(1);
        }
    }

    private static Options options(String[] args) {
        Path input=null, output=Path.of("output"); String model="all"; int fps=60;
        for (int i=0;i<args.length;i++) {
            if (i+1>=args.length) throw new IllegalArgumentException("Missing value for "+args[i]);
            String key=args[i], value=args[++i];
            switch(key) {
                case "--input" -> input=Path.of(value);
                case "--out" -> output=Path.of(value);
                case "--model" -> model=value.toLowerCase(Locale.ROOT);
                case "--fps" -> fps=Integer.parseInt(value);
                default -> throw new IllegalArgumentException("Unknown option: "+key);
            }
        }
        if(fps<15||fps>120)throw new IllegalArgumentException("--fps must be between 15 and 120.");
        return new Options(input,output,model,fps);
    }
    private static void help() {
        System.out.println("""
            HINARIA Motion Java — JDK 17+
            java -jar HinariaMotion.jar [--out output] [--model all|cavaleiro|paladino|feiticeiro|druida|bandido|esqueleto|orc] [--fps 60]
            java HinariaAnimator.java --input assets/hinaria-rigs.json.gz --out output
            Animation data and GLB export are generated entirely by Java.
            """);
    }
    private static void atomicWrite(Path target,byte[] bytes) throws IOException {
        Path absolute=target.toAbsolutePath(), parent=absolute.getParent();
        Files.createDirectories(parent); Path temp=Files.createTempFile(parent,"hinaria-export-",".tmp");
        try {
            Files.write(temp,bytes);
            try {Files.move(temp,absolute,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}
            catch(AtomicMoveNotSupportedException e){Files.move(temp,absolute,StandardCopyOption.REPLACE_EXISTING);}
        } finally {Files.deleteIfExists(temp);}
    }
    private static double clamp(double v){return Math.max(0,Math.min(1,v));}
    private static double smooth(double v){v=clamp(v);return v*v*(3-2*v);}
    private static double pulse(double p,double start,double finish){
        return smooth(p/start)*(1-smooth((p-finish)/(1-finish)));
    }

    static final class Pose {
        final Map<String,double[]> rotations=new LinkedHashMap<>();
        double x,y,z,sx=1,sy=1,sz=1,cape;
        Pose(double right,double left){
            rotations.put("body",new double[3]);rotations.put("head",new double[3]);
            rotations.put("armR",new double[]{right,0,0});rotations.put("armL",new double[]{left,0,0});
            rotations.put("legR",new double[3]);rotations.put("legL",new double[3]);
        }
        void x(String role,double value){rotations.get(role)[0]=value;}
    }

    /** Motion recipes derived from HINARIA's actual CharacterAnimator pivots. */
    private static Pose pose(Clip clip,double p,Map<String,Object> model){
        boolean aim=Boolean.TRUE.equals(model.get("aim"));
        double restR=aim?-.6:-.22,restL=aim?-.95:-.22;
        Pose v=new Pose(restR,restL);
        double phase=p*TAU,amp=number(model.get("amp")),swing=number(model.get("swing"));
        String primary=string(model.get("primaryArm")),other=primary.equals("armR")?"armL":"armR";
        double primaryRest=primary.equals("armR")?restR:restL,otherRest=other.equals("armR")?restR:restL;
        switch(clip.name){
            case "Idle" -> {
                v.y=Math.sin(phase)*.011;
                v.x("head",Math.sin(phase)*.025);v.rotations.get("head")[1]=Math.sin(phase)*.045;
                v.cape=Math.sin(phase)*.04;
            }
            case "Walk","Run" -> {
                boolean run=clip.name.equals("Run");
                double intensity=run?1:2.2/3.2,stride=Math.sin(phase)*amp*intensity*(run?.9:.6);
                v.x("legR",stride);v.x("legL",-stride);
                v.x("armR",restR-Math.sin(phase)*(run?.49:.29)*intensity);
                v.x("armL",restL+(aim?0:Math.sin(phase)*(run?.49:.29)*intensity));
                v.y=(1-Math.cos(phase*2))*.5*(run?.075:.035)*intensity;
                v.x("body",run?.08:.015);v.x("head",run?.09:.03);
                v.cape=(run?.42:.2)+Math.sin(phase)*.07;
            }
            case "Attack","AttackHeavy" -> {
                double strike=Math.sin(Math.PI*p),heavy=clip.name.equals("AttackHeavy")?1.16:1;
                v.x(primary,primaryRest-strike*swing*heavy);
                v.x(other,otherRest-strike*(aim?.4:.16));
                double[] body=v.rotations.get("body");body[0]=-strike*(heavy>1?.22:.1);body[1]=strike*.24;
                v.z=-strike*(heavy>1?.09:.06);v.x("head",-.07*strike);v.cape=.12*strike;
            }
            case "Hit" -> {
                double recoil=smooth(p/.10)*(1-smooth((p-.12)/.88));
                v.x=Math.sin(phase*3)*.038*recoil;v.z=-.065*recoil;
                v.x("body",-.18*recoil);v.rotations.get("body")[2]=Math.sin(phase*2)*.12*recoil;
                v.x("armR",restR+.3*recoil);v.x("armL",restL+.3*recoil);v.x("head",-.2*recoil);v.cape=-.12*recoil;
            }
            case "Block" -> {
                double e=pulse(p,.2,.63);
                v.x(other,otherRest-1.1*e);v.rotations.get(other)[2]=(other.equals("armR")?-.22:.22)*e;
                v.x(primary,primaryRest-.45*e);v.x("body",-.08*e);v.x("head",.08*e);
            }
            case "Dodge" -> {
                double e=Math.sin(Math.PI*p);
                v.y=-.10*e;v.x("body",-.28*e);v.rotations.get("body")[2]=-.13*e;
                v.x("armR",restR-.45*e);v.x("armL",restL-.45*e);v.cape=-.25*e;
                v.x("legR",-.12*e);v.x("legL",.12*e);
            }
            case "Jump" -> {
                double air=clamp((p-.19)/.55),prep=Math.sin(Math.PI*clamp(p/.19));
                double land=Math.sin(Math.PI*clamp((p-.74)/.20)),lift=4*air*(1-air);
                v.y=1.15*lift-.06*prep-.07*land;v.sx=v.sz=1+.06*prep+.08*land;
                v.sy=1-.10*prep-.12*land+.04*lift;
                v.x("armR",restR-.7*lift);v.x("armL",restL-.7*lift);
                v.x("legR",-.22*lift);v.x("legL",.24*lift);v.cape=.3*lift;
            }
            case "Death" -> {
                double e=1-Math.pow(1-clamp(p/.72),3);
                v.x("body",1.46*e);v.y=.18*e;v.z=.15*e;
                v.x("armR",restR+1.4*e);v.x("armL",restL+1.2*e);
                v.x("legR",.26*e);v.x("legL",.26*e);v.x("head",.45*e);v.cape=-.2*e;
            }
            default -> throw new IllegalArgumentException("Unknown clip.");
        }
        return v;
    }
    private static double[] quaternion(double x,double y,double z) {
        double c1=Math.cos(x/2),c2=Math.cos(y/2),c3=Math.cos(z/2),s1=Math.sin(x/2),s2=Math.sin(y/2),s3=Math.sin(z/2);
        return new double[]{s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3};
    }
    private static double[] multiply(double[] a,double[] b) {
        double[] q={a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
            a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
            a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
            a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]};
        double length=0;for(double v:q)length+=v*v;length=Math.sqrt(length);
        for(int i=0;i<4;i++)q[i]/=length;return q;
    }

    static final class Exporter {
        final Map<String,Object> model;
        final int fps;
        final ByteArrayOutputStream binary=new ByteArrayOutputStream();
        final List<Object> views=new ArrayList<>(),accessors=new ArrayList<>();
        int discardedTriangles=0;
        Exporter(Map<String,Object> model,int fps){this.model=model;this.fps=fps;}

        int accessor(float[] values,int width,String type,Integer target,boolean bounds){
            if(values.length%width!=0)throw new IllegalArgumentException("Accessor width mismatch.");
            while(binary.size()%4!=0)binary.write(0);
            int offset=binary.size();ByteBuffer data=ByteBuffer.allocate(values.length*4).order(ByteOrder.LITTLE_ENDIAN);
            double[] min=new double[width],max=new double[width];Arrays.fill(min,Double.POSITIVE_INFINITY);Arrays.fill(max,Double.NEGATIVE_INFINITY);
            for(int i=0;i<values.length;i++){
                float value=values[i];if(!Float.isFinite(value))throw new IllegalArgumentException("Nonfinite animation or geometry value.");
                data.putFloat(value);min[i%width]=Math.min(min[i%width],value);max[i%width]=Math.max(max[i%width],value);
            }
            binary.writeBytes(data.array());int view=views.size();
            Map<String,Object> bufferView=obj("buffer",0,"byteOffset",offset,"byteLength",data.capacity());
            if(target!=null)bufferView.put("target",target);views.add(bufferView);
            Map<String,Object> entry=obj("bufferView",view,"componentType",5126,"count",values.length/width,"type",type);
            if(bounds){entry.put("min",min);entry.put("max",max);}
            int index=accessors.size();accessors.add(entry);return index;
        }
        int accessor(List<Object> values,String semantic){
            float[] data=new float[values.size()];for(int i=0;i<data.length;i++)data[i]=(float)number(values.get(i));
            return accessor(data,3,"VEC3",34962,semantic.equals("POSITION"));
        }
        Map<String,Object> cleanGeometry(Map<String,Object> source){
            List<Object> positions=list(source.get("POSITION"));
            if(positions.size()%9!=0)throw new IllegalArgumentException("Expected triangle-list geometry.");
            int[] keep=new int[positions.size()/3];int kept=0;
            for(int i=0;i<positions.size();i+=9){
                double ax=number(positions.get(i+3))-number(positions.get(i)),ay=number(positions.get(i+4))-number(positions.get(i+1)),az=number(positions.get(i+5))-number(positions.get(i+2));
                double bx=number(positions.get(i+6))-number(positions.get(i)),by=number(positions.get(i+7))-number(positions.get(i+1)),bz=number(positions.get(i+8))-number(positions.get(i+2));
                double nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
                if(nx*nx+ny*ny+nz*nz<1e-20){discardedTriangles++;continue;}
                for(int k=0;k<3;k++)keep[kept++]=i/3+k;
            }
            if(kept==0)throw new IllegalArgumentException("A source mesh has no nondegenerate triangles.");
            Map<String,Object> result=new LinkedHashMap<>();
            for(var entry:source.entrySet()){
                List<Object> values=list(entry.getValue());
                if(values.size()!=positions.size())throw new IllegalArgumentException("Vertex attribute count mismatch.");
                float[] data=new float[kept*3];
                for(int i=0;i<kept;i++)for(int k=0;k<3;k++)data[i*3+k]=(float)number(values.get(keep[i]*3+k));
                if(entry.getKey().equals("NORMAL")){
                    for(int i=0;i<data.length;i+=3){
                        double length=Math.sqrt(data[i]*data[i]+data[i+1]*data[i+1]+data[i+2]*data[i+2]);
                        if(length<1e-10){data[i]=0;data[i+1]=1;data[i+2]=0;}
                        else for(int k=0;k<3;k++)data[i+k]/=(float)length;
                    }
                }
                result.put(entry.getKey(),accessor(data,3,"VEC3",34962,entry.getKey().equals("POSITION")));
            }
            return result;
        }
        byte[] build() {
            List<Object> meshes=new ArrayList<>();Map<Integer,Map<String,Object>> geometryAccessors=new HashMap<>();
            List<Object> geometries=list(model.get("geometries"));
            for(Object item:list(model.get("meshes"))){
                Map<String,Object> mesh=map(item);int gi=integer(mesh.get("geometry"));
                Map<String,Object> attrs=geometryAccessors.computeIfAbsent(gi,key->{
                    return cleanGeometry(map(geometries.get(key)));
                });
                meshes.add(obj("primitives",List.of(obj("attributes",attrs,"material",mesh.get("material"),"mode",4))));
            }
            List<Object> nodes=list(model.get("nodes")),animations=new ArrayList<>();
            Map<String,Object> roles=map(model.get("roles"));List<Object> cape=list(model.get("cape"));
            for(Clip clip:CLIPS){
                int steps=Math.max(2,(int)Math.ceil(clip.duration*fps)),count=steps+1;
                float[] times=new float[count];Pose[] samples=new Pose[count];
                for(int i=0;i<count;i++){
                    double p=(double)i/steps;times[i]=(float)(p*clip.duration);
                    samples[i]=pose(clip,clip.loop&&i==steps?0:p,model);
                }
                int input=accessor(times,1,"SCALAR",null,true);
                List<Object> samplers=new ArrayList<>(),channels=new ArrayList<>();
                for(var role:roles.entrySet()){
                    int node=integer(role.getValue());double[] bind=doubles(map(nodes.get(node)).get("rotation"));
                    float[] rotations=new float[count*4];double[] previous=null;
                    for(int i=0;i<count;i++){
                        double[] euler=samples[i].rotations.get(role.getKey());
                        if(euler==null)throw new IllegalArgumentException("Unknown rig role: "+role.getKey());
                        double[] q=multiply(bind,quaternion(euler[0],euler[1],euler[2]));
                        if(previous!=null){double dot=0;for(int k=0;k<4;k++)dot+=q[k]*previous[k];if(dot<0)for(int k=0;k<4;k++)q[k]=-q[k];}
                        for(int k=0;k<4;k++)rotations[i*4+k]=(float)q[k];previous=q;
                    }
                    track(channels,samplers,input,node,"rotation",rotations,4,"VEC4");
                }
                for(int j=0;j<cape.size();j++){
                    int node=integer(cape.get(j));double[] bind=doubles(map(nodes.get(node)).get("rotation"));
                    float[] rotations=new float[count*4];
                    for(int i=0;i<count;i++){
                        double motion=samples[i].cape;
                        double[] q=multiply(bind,quaternion(motion,0,0));for(int k=0;k<4;k++)rotations[i*4+k]=(float)q[k];
                    }
                    track(channels,samplers,input,node,"rotation",rotations,4,"VEC4");
                }
                int body=integer(roles.get("body"));Map<String,Object> bodyNode=map(nodes.get(body));
                double[] translation=doubles(bodyNode.get("translation")),scale=doubles(bodyNode.get("scale"));
                float[] translations=new float[count*3],scales=new float[count*3];
                for(int i=0;i<count;i++){
                    Pose s=samples[i];translations[i*3]=(float)(translation[0]+s.x);translations[i*3+1]=(float)(translation[1]+s.y);translations[i*3+2]=(float)(translation[2]+s.z);
                    scales[i*3]=(float)(scale[0]*s.sx);scales[i*3+1]=(float)(scale[1]*s.sy);scales[i*3+2]=(float)(scale[2]*s.sz);
                }
                track(channels,samplers,input,body,"translation",translations,3,"VEC3");
                track(channels,samplers,input,body,"scale",scales,3,"VEC3");
                animations.add(obj("name",clip.name,"channels",channels,"samplers",samplers,
                    "extras",obj("label",clip.label,"loop",clip.loop,"generatedBy","Java","duration",clip.duration)));
            }
            int binaryLength=binary.size();
            Map<String,Object> gltf=obj("asset",obj("version","2.0","generator","HINARIA Motion Java / JDK 17+"),
                "scene",0,"scenes",List.of(obj("name",model.get("name"),"nodes",List.of(0))),
                "nodes",nodes,"meshes",meshes,"materials",model.get("materials"),
                "animations",animations,"buffers",List.of(obj("byteLength",binaryLength)),
                "bufferViews",views,"accessors",accessors,
                "extras",obj("source","HINARIA_UPGRADE_1.2.0","rigKind","rigid node hierarchy","primaryArm",model.get("primaryArm"),"removedDegenerateTriangles",discardedTriangles));
            byte[] json=Json.write(gltf).getBytes(StandardCharsets.UTF_8);
            int jsonLength=(json.length+3)&~3,binLength=(binaryLength+3)&~3;
            ByteBuffer glb=ByteBuffer.allocate(12+8+jsonLength+8+binLength).order(ByteOrder.LITTLE_ENDIAN);
            glb.putInt(0x46546c67).putInt(2).putInt(glb.capacity());
            glb.putInt(jsonLength).putInt(0x4e4f534a).put(json);while(glb.position()%4!=0)glb.put((byte)0x20);
            glb.putInt(binLength).putInt(0x004e4942).put(binary.toByteArray());while(glb.hasRemaining())glb.put((byte)0);
            return glb.array();
        }
        void track(List<Object> channels,List<Object> samplers,int input,int node,String path,float[] data,int width,String type){
            int output=accessor(data,width,type,null,false),index=samplers.size();
            samplers.add(obj("input",input,"output",output,"interpolation","LINEAR"));
            channels.add(obj("sampler",index,"target",obj("node",node,"path",path)));
        }
    }

    static Map<String,Object> obj(Object... pairs){
        Map<String,Object> result=new LinkedHashMap<>();for(int i=0;i<pairs.length;i+=2)result.put((String)pairs[i],pairs[i+1]);return result;
    }
    @SuppressWarnings("unchecked") static Map<String,Object> map(Object o){
        if(!(o instanceof Map))throw new IllegalArgumentException("Expected JSON object.");return (Map<String,Object>)o;
    }
    @SuppressWarnings("unchecked") static List<Object> list(Object o){
        if(!(o instanceof List))throw new IllegalArgumentException("Expected JSON array.");return (List<Object>)o;
    }
    static double number(Object o){if(!(o instanceof Number n))throw new IllegalArgumentException("Expected number.");return n.doubleValue();}
    static int integer(Object o){double value=number(o);if(value!=(int)value)throw new IllegalArgumentException("Expected integer.");return (int)value;}
    static String string(Object o){if(!(o instanceof String s))throw new IllegalArgumentException("Expected string.");return s;}
    static double[] doubles(Object o){List<Object> a=list(o);double[] result=new double[a.size()];for(int i=0;i<a.size();i++)result[i]=number(a.get(i));return result;}

    /** Small strict JSON codec, keeping the Java exporter dependency free. */
    static final class Json {
        final String text;int at=0,depth=0;
        Json(String text){this.text=text;}
        static Object parse(String text){Json j=new Json(text);Object result=j.value();j.space();if(j.at!=text.length())throw j.error("Trailing input");return result;}
        IllegalArgumentException error(String message){return new IllegalArgumentException(message+" at JSON offset "+at);}
        void space(){while(at<text.length()&&Character.isWhitespace(text.charAt(at)))at++;}
        char next(){if(at>=text.length())throw error("Unexpected end");return text.charAt(at++);}
        void expect(char expected){space();if(next()!=expected)throw error("Expected "+expected);}
        Object value(){
            space();if(++depth>128)throw error("Excessive nesting");
            try{
                if(at>=text.length())throw error("Unexpected end");
                char c=text.charAt(at);
                if(c=='"')return quoted();
                if(c=='{'){
                    at++;Map<String,Object> result=new LinkedHashMap<>();space();if(at<text.length()&&text.charAt(at)=='}'){at++;return result;}
                    while(true){space();String key=quoted();expect(':');Object v=value();if(result.containsKey(key))throw error("Duplicate key");result.put(key,v);space();char sep=next();if(sep=='}')return result;if(sep!=',')throw error("Expected comma");}
                }
                if(c=='['){
                    at++;List<Object> result=new ArrayList<>();space();if(at<text.length()&&text.charAt(at)==']'){at++;return result;}
                    while(true){result.add(value());space();char sep=next();if(sep==']')return result;if(sep!=',')throw error("Expected comma");}
                }
                for(String literal:List.of("true","false","null"))if(text.startsWith(literal,at)){at+=literal.length();return literal.equals("null")?null:Boolean.valueOf(literal);}
                int start=at;if(c=='-')at++;
                if(at>=text.length())throw error("Invalid number");
                if(text.charAt(at)=='0')at++;else{int digit=at;while(at<text.length()&&Character.isDigit(text.charAt(at)))at++;if(at==digit)throw error("Invalid number");}
                if(at<text.length()&&text.charAt(at)=='.'){at++;int digit=at;while(at<text.length()&&Character.isDigit(text.charAt(at)))at++;if(at==digit)throw error("Invalid fraction");}
                if(at<text.length()&&(text.charAt(at)=='e'||text.charAt(at)=='E')){at++;if(at<text.length()&&(text.charAt(at)=='+'||text.charAt(at)=='-'))at++;int digit=at;while(at<text.length()&&Character.isDigit(text.charAt(at)))at++;if(at==digit)throw error("Invalid exponent");}
                double n=Double.parseDouble(text.substring(start,at));if(!Double.isFinite(n))throw error("Nonfinite number");return n;
            }finally{depth--;}
        }
        String quoted(){
            if(next()!='"')throw error("Expected string");StringBuilder b=new StringBuilder();
            while(true){char c=next();if(c=='"')return b.toString();if(c<32)throw error("Control character");if(c!='\\'){b.append(c);continue;}
                char e=next();switch(e){case '"','\\','/'->b.append(e);case 'b'->b.append('\b');case 'f'->b.append('\f');case 'n'->b.append('\n');case 'r'->b.append('\r');case 't'->b.append('\t');case 'u'->{if(at+4>text.length())throw error("Unicode escape");b.append((char)Integer.parseInt(text.substring(at,at+4),16));at+=4;}default->throw error("Invalid escape");}
            }
        }
        static String write(Object value){StringBuilder b=new StringBuilder();append(b,value);return b.toString();}
        static void append(StringBuilder b,Object v){
            if(v==null){b.append("null");return;}
            if(v instanceof String s){b.append('"');for(char c:s.toCharArray()){switch(c){case '"'->b.append("\\\"");case '\\'->b.append("\\\\");case '\n'->b.append("\\n");case '\r'->b.append("\\r");case '\t'->b.append("\\t");default->{if(c<32)b.append(String.format("\\u%04x",(int)c));else b.append(c);}}}b.append('"');return;}
            if(v instanceof Number n){if(!Double.isFinite(n.doubleValue()))throw new IllegalArgumentException("JSON nonfinite number.");b.append(n);return;}
            if(v instanceof Boolean){b.append(v);return;}
            if(v instanceof Map<?,?> m){b.append('{');boolean first=true;for(var e:m.entrySet()){if(!first)b.append(',');first=false;append(b,e.getKey().toString());b.append(':');append(b,e.getValue());}b.append('}');return;}
            if(v instanceof Iterable<?> a){b.append('[');boolean first=true;for(Object item:a){if(!first)b.append(',');first=false;append(b,item);}b.append(']');return;}
            if(v.getClass().isArray()){b.append('[');int count=java.lang.reflect.Array.getLength(v);for(int i=0;i<count;i++){if(i>0)b.append(',');append(b,java.lang.reflect.Array.get(v,i));}b.append(']');return;}
            throw new IllegalArgumentException("Unsupported JSON value.");
        }
    }
}

using System.Text;

namespace Orvexa.Core;

public sealed class CrashLogService
{
    const long RotateAtBytes=1024L*1024;
    const int KeepTailBytes=256*1024;
    readonly string path;

    public CrashLogService(string? basePath=null)
    {
        var dir=StoragePaths.Resolve(basePath);
        path=Path.Combine(dir,"crash.log");
    }

    public void Write(Exception ex)
    {
        try
        {
            RotateIfNeeded();
            var entry=$"{DateTimeOffset.Now:u} {ex.GetType().Name}: {LogSanitizer.Clean(ex.Message,1000)}{Environment.NewLine}";
            File.AppendAllText(path,entry,new UTF8Encoding(false));
        }
        catch { }
    }

    void RotateIfNeeded()
    {
        try
        {
            var info=new FileInfo(path);
            if(!info.Exists || info.Length<=RotateAtBytes) return;

            var keep=(int)Math.Min(info.Length,KeepTailBytes);
            var tail=new byte[keep];

            using(var source=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.ReadWrite|FileShare.Delete))
            {
                source.Seek(-keep,SeekOrigin.End);
                var offset=0;
                while(offset<keep)
                {
                    var read=source.Read(tail,offset,keep-offset);
                    if(read==0) break;
                    offset+=read;
                }
                if(offset<keep) Array.Resize(ref tail,offset);
            }

            var rotated=path+".1";
            try { File.WriteAllBytes(rotated,tail); } catch { }
            try { File.Delete(path); } catch { }
        }
        catch { }
    }
}

using System.Text;

namespace Orvexa.Core;

public static class AtomicFile
{
    const int BufferSize=32*1024;
    static readonly UTF8Encoding StrictUtf8=new(false,true);
    static readonly UTF8Encoding Utf8NoBom=new(false);

    public static bool TryReadText(string path,long maxBytes,out string text)
    {
        text="";
        if(string.IsNullOrWhiteSpace(path) || maxBytes<=0) return false;

        try
        {
            using var stream=new FileStream(
                path,
                FileMode.Open,
                FileAccess.Read,
                FileShare.ReadWrite|FileShare.Delete,
                BufferSize,
                FileOptions.SequentialScan);

            if(stream.Length<0 || stream.Length>maxBytes) return false;

            using var buffer=new MemoryStream((int)Math.Min(stream.Length,256L*1024));
            var chunk=new byte[BufferSize];
            long total=0;

            while(true)
            {
                var read=stream.Read(chunk,0,chunk.Length);
                if(read==0) break;

                total+=read;
                if(total>maxBytes) return false;
                buffer.Write(chunk,0,read);
            }

            var bytes=buffer.ToArray();
            var offset=bytes.Length>=3 && bytes[0]==0xEF && bytes[1]==0xBB && bytes[2]==0xBF ? 3 : 0;
            text=StrictUtf8.GetString(bytes,offset,bytes.Length-offset);
            return true;
        }
        catch
        {
            text="";
            return false;
        }
    }

    public static void WriteText(string path,string content)
    {
        if(string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Path is required.",nameof(path));

        var directory=Path.GetDirectoryName(path);
        if(!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);

        var tmp=path+"."+Guid.NewGuid().ToString("N")+".tmp";
        try
        {
            using(var stream=new FileStream(
                tmp,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                BufferSize,
                FileOptions.WriteThrough))
            {
                using var writer=new StreamWriter(stream,Utf8NoBom,BufferSize,leaveOpen:true);
                writer.Write(content??"");
                writer.Flush();
                stream.Flush(flushToDisk:true);
            }

            File.Move(tmp,path,true);
        }
        finally
        {
            try { if(File.Exists(tmp)) File.Delete(tmp); } catch { }
        }
    }
}

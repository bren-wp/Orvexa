namespace Orvexa.Core;

public static class AtomicFile
{
    public static bool TryReadText(string path,long maxBytes,out string text)
    {
        text="";
        try
        {
            var file=new FileInfo(path);
            if(!file.Exists || file.Length<0 || file.Length>maxBytes) return false;
            text=File.ReadAllText(path);
            return true;
        }
        catch { return false; }
    }

    public static void WriteText(string path,string content)
    {
        var directory=Path.GetDirectoryName(path);
        if(!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);

        var tmp=path+"."+Guid.NewGuid().ToString("N")+".tmp";
        try
        {
            File.WriteAllText(tmp,content);
            File.Move(tmp,path,true);
        }
        finally
        {
            try { if(File.Exists(tmp)) File.Delete(tmp); } catch { }
        }
    }
}
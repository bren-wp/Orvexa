namespace Orvexa.Core;
public sealed class CrashLogService{
 readonly string path;
 public CrashLogService(string? basePath=null){var dir=StoragePaths.Resolve(basePath);path=Path.Combine(dir,"crash.log");}
 public void Write(Exception ex){try{if(File.Exists(path)&&new FileInfo(path).Length>1024*1024){var bytes=File.ReadAllBytes(path);File.WriteAllBytes(path,bytes[^Math.Min(bytes.Length,256*1024)..]);}File.AppendAllText(path,$"{DateTimeOffset.Now:u} {ex.GetType().Name}: {LogSanitizer.Clean(ex.Message,1000)}{Environment.NewLine}");}catch{}}
}
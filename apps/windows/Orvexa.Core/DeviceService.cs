namespace Orvexa.Core;

public sealed class DeviceService
{
    public DeviceProfile Detect()
    {
        var os=System.Runtime.InteropServices.RuntimeInformation.OSDescription;
        var architecture=System.Runtime.InteropServices.RuntimeInformation.OSArchitecture.ToString();
        return new DeviceProfile("Windows PC","",os,architecture,"general");
    }
}
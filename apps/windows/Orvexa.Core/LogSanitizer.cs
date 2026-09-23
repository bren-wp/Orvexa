namespace Orvexa.Core;

public static class LogSanitizer
{
    public static string Clean(string? value, int max = 2000)
    {
        var text = value ?? "";

        var userName = Environment.UserName;
        if (!string.IsNullOrWhiteSpace(userName))
        {
            text = text.Replace(userName, "[user]", StringComparison.OrdinalIgnoreCase);
        }

        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        if (!string.IsNullOrWhiteSpace(home))
        {
            text = text.Replace(home, "[profile]", StringComparison.OrdinalIgnoreCase);
        }

        text = new string(text
            .Where(c => c is '\r' or '\n' or '\t' || !char.IsControl(c))
            .ToArray());

        max = Math.Clamp(max, 128, 16_384);
        return text.Length > max ? text[..max] + "..." : text;
    }
}

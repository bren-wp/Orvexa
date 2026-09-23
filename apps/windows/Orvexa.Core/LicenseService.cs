namespace Orvexa.Core;

public sealed class LicenseService
{
    public const string Version="1.0";

    public static string Text=>"""
ORVEXA SOFTWARE LICENSE AGREEMENT

By installing or using Orvexa, you agree to this license.

1. License. You are granted a limited, non-exclusive right to install and use Orvexa.
2. Third-party software. Orvexa can discover and invoke package-management operations for third-party software. Each third-party package remains subject to its publisher's own license and terms.
3. Network access. Package searches, downloads and updates may contact configured package sources such as Windows Package Manager sources.
4. Local data. Orvexa stores application preferences, favorites, catalog cache, activity and diagnostics locally on the device.
5. Security. Do not use Orvexa to install software you do not trust. Review package identity and publisher information before installation.
6. Warranty. Orvexa is provided without warranties to the maximum extent permitted by applicable law.
7. Limitation. Liability is limited to the maximum extent permitted by applicable law.
8. Termination. You may stop using and uninstall Orvexa at any time.

If you do not accept these terms, do not install Orvexa.
""";
}
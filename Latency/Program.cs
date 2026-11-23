namespace Latency;

static class Program
{
    /// <summary>
    ///  The main entry point for the application.
    /// </summary>
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.ThreadException += (_, args) => ShowFatalError(args.Exception);
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            if (args.ExceptionObject is Exception exception)
                ShowFatalError(exception);
        };

        try
        {
            Application.Run(new Form1());
        }
        catch (Exception exception)
        {
            ShowFatalError(exception);
        }
    }

    private static void ShowFatalError(Exception exception)
    {
        var logPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "WowLatencyMonitor.log");
        File.WriteAllText(logPath, exception.ToString());
        MessageBox.Show(
            $"La aplicación encontró un error:\n\n{exception.Message}\n\nDetalle: {logPath}",
            "Error",
            MessageBoxButtons.OK,
            MessageBoxIcon.Error);
    }
}
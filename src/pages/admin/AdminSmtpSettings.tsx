// src/pages/admin/AdminSmtpSettings.tsx
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "../../hooks/useSmartBack";
import { useSmtpSettings, useSaveSmtpSettings, useSendTestEmail } from "../../hooks/useAdminComms";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/Button";

export function AdminSmtpSettings() {
  const smartBack = useSmartBack();
  const { data: settings, isLoading } = useSmtpSettings();
  const save = useSaveSmtpSettings();
  const sendTest = useSendTestEmail();

  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("Akọ.");
  const [useTls, setUseTls] = useState(true);
  const [testTo, setTestTo] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setHost(settings.host);
    setPort(String(settings.port));
    setUsername(settings.username);
    setFromEmail(settings.from_email);
    setFromName(settings.from_name);
    setUseTls(settings.use_tls);
  }, [settings]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSavedMsg(null);
    try {
      await save.mutateAsync({
        host,
        port: Number(port),
        username,
        password: password || undefined,
        from_email: fromEmail,
        from_name: fromName,
        use_tls: useTls,
      });
      setPassword("");
      setSavedMsg("Saved.");
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err: any) {
      setSavedMsg(err.message ?? "Couldn't save settings.");
    }
  }

  async function handleTest() {
    setTestMsg(null);
    try {
      await sendTest.mutateAsync(testTo);
      setTestMsg(`Test email sent to ${testTo}.`);
    } catch (err: any) {
      setTestMsg(err.message ?? "Couldn't send test email.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={smartBack} className="text-ink-muted">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display text-xl text-ink">SMTP settings</h2>
        </div>

        {isLoading ? (
          <p className="text-ink-muted text-center py-10">Loading…</p>
        ) : (
          <>
            <form onSubmit={handleSave} className="bg-surface rounded-xl p-4 border border-border mb-4">
              <FormField id="host" label="SMTP host" value={host} onChange={(e) => setHost(e.target.value)} required />
              <FormField
                id="port"
                label="Port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                required
              />
              <FormField
                id="username"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <FormField
                id="password"
                label={settings?.has_password ? "Password (leave blank to keep current)" : "Password"}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FormField
                id="from_email"
                label="From email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                required
              />
              <FormField
                id="from_name"
                label="From name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                required
              />

              <label className="flex items-center gap-2 mb-4 text-sm text-ink">
                <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)} />
                Use TLS
              </label>

              {savedMsg && <p className="text-sm text-accent mb-3">{savedMsg}</p>}

              <Button type="submit" loading={save.isPending}>
                Save settings
              </Button>
            </form>

            <div className="bg-surface rounded-xl p-4 border border-border">
              <p className="text-sm font-medium text-ink mb-2">Send a test email</p>
              <div className="flex gap-2">
                <input
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-canvas text-ink text-sm"
                />
                <button
                  onClick={handleTest}
                  disabled={sendTest.isPending || !testTo}
                  className="bg-accent text-canvas px-4 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {sendTest.isPending ? "Sending…" : "Send"}
                </button>
              </div>
              {testMsg && <p className="text-sm text-ink-muted mt-2">{testMsg}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useTranslation } from '../uiLanguage';
import { FormEvent, useState } from 'react';
import { BookOpenCheck, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { ProfileRecord, UserId } from '../types/exam';

interface Props {
  profiles: ProfileRecord[];
  onLogin: (userId: UserId, pin?: string) => Promise<boolean>;
  onSetPin: (userId: UserId, pin: string | null, currentPin?: string) => Promise<boolean>;
}

export default function ProfileSelector({ profiles, onLogin, onSetPin }: Props) {
  const t = useTranslation();
  const [selected, setSelected] = useState<ProfileRecord | null>(null);
  const [mode, setMode] = useState<'login' | 'manage'>('login');
  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState('');

  const chooseProfile = async (profile: ProfileRecord) => {
    if (!profile.pinConfigured) {
      await onLogin(profile.id);
      return;
    }
    setSelected(profile);
    setMode('login');
    setError('');
    setPin('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !/^\d{4}$/.test(pin)) {
      setError('Enter a valid 4-digit PIN.');
      return;
    }
    const success = mode === 'login'
      ? await onLogin(selected.id, pin)
      : await onSetPin(selected.id, pin, currentPin || undefined);
    if (!success) setError(mode === 'login' ? 'Incorrect PIN. Try again.' : 'Current PIN is incorrect.');
    else setSelected(null);
  };

  const openPinManager = (profile: ProfileRecord) => {
    setSelected(profile);
    setMode('manage');
    setError('');
    setPin('');
    setCurrentPin('');
  };

  const removePin = async () => {
    if (!selected || !/^\d{4}$/.test(currentPin)) {
      setError('Enter the current 4-digit PIN first.');
      return;
    }
    const success = await onSetPin(selected.id, null, currentPin);
    if (success) setSelected(null);
    else setError('Current PIN is incorrect.');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#dcecff,_transparent_45%),linear-gradient(135deg,#f8fafc,#eef2f7)] px-8 py-12">
      <section className="w-full max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-200"><BookOpenCheck size={34} /></div>
          <p className="eyebrow">{t("Offline examination suite", "ऑफ़लाइन परीक्षा अभ्यास")}</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">{t("RVUNL CBT Mock Exam", "RVUNL CBT मॉक परीक्षा")}</h1>
          <p className="mt-3 text-slate-600">{t("Junior Assistant / Commercial Assistant-II · Phase-I", "कनिष्ठ सहायक / वाणिज्यिक सहायक-II · चरण I")}</p>
        </div>
        <div className="grid grid-cols-2 gap-7">
          {profiles.map((profile, index) => (
            <article key={profile.id} className={`card overflow-hidden border-t-4 transition hover:-translate-y-1 hover:shadow-xl ${index ? 'border-t-violet-500' : 'border-t-cyan-500'}`}>
              <button className="group flex w-full items-center gap-5 p-7 text-left hover:bg-slate-50" onClick={() => void chooseProfile(profile)}>
                <span className={`flex h-20 w-20 items-center justify-center rounded-2xl text-white ${index ? 'bg-violet-600' : 'bg-cyan-700'}`}><UserRound size={40} /></span>
                <span className="flex-1">
                  <span className="block text-2xl font-bold text-slate-900">{profile.name}</span>
                  <span className="mt-1 flex items-center gap-2 text-sm text-slate-500">{profile.pinConfigured ? <><LockKeyhole size={15} /> {t("PIN protected", "पिन से सुरक्षित")}</> : <><ShieldCheck size={15} /> {t("One-click login", "एक क्लिक से खोलें")}</>}</span>
                  <span className="mt-4 inline-block font-semibold text-navy group-hover:underline">{t("Open dashboard →", "डैशबोर्ड खोलें →")}</span>
                </span>
              </button>
              <div className="border-t border-slate-100 px-7 py-3 text-right">
                <button className="text-sm font-semibold text-slate-500 hover:text-navy" onClick={() => openPinManager(profile)}>{profile.pinConfigured ? 'Change or remove PIN' : 'Add optional PIN'}</button>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">{t("All attempts and imported papers stay on this computer. No internet is required.", "सभी टेस्ट और इम्पोर्ट किए पेपर इसी कंप्यूटर पर रहते हैं। इंटरनेट की ज़रूरत नहीं है।")}</p>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-6" role="dialog" aria-modal="true">
          <form onSubmit={(event) => void submit(event)} className="card w-full max-w-md p-7">
            <h2 className="text-2xl font-bold">{mode === 'login' ? `Welcome, ${selected.name}` : `Manage ${selected.name}'s PIN`}</h2>
            <p className="mt-2 text-sm text-slate-500">{mode === 'login' ? 'Enter your local 4-digit PIN.' : 'Use any four digits. The desktop app stores only a one-way hash.'}</p>
            {mode === 'manage' && selected.pinConfigured && (
              <label className="mt-5 block text-sm font-semibold">{t("Current PIN", "मौजूदा पिन")}
                <input autoFocus className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 tracking-[0.5em]" inputMode="numeric" maxLength={4} type="password" value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ''))} />
              </label>
            )}
            <label className="mt-5 block text-sm font-semibold">{mode === 'login' ? 'PIN' : 'New PIN'}
              <input autoFocus={mode === 'login' || !selected.pinConfigured} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 tracking-[0.5em]" inputMode="numeric" maxLength={4} type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} />
            </label>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>{t("Cancel", "रद्द करें")}</button>
              <div className="flex gap-2">
                {mode === 'manage' && selected.pinConfigured && <button type="button" className="rounded-lg px-3 py-2 font-semibold text-red-700 hover:bg-red-50" onClick={() => void removePin()}>{t("Remove", "हटाएँ")}</button>}
                <button className="btn-primary" type="submit">{mode === 'login' ? 'Unlock' : 'Save PIN'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

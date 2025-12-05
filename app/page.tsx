import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 py-16">
      <header className="flex flex-col gap-6 rounded-3xl bg-white/80 p-10 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-500">
              MomsCare
            </p>
            <h1 className="mt-2 text-4xl font-bold text-slate-900 md:text-5xl">
              Pregnancy guidance with trusted doctors and AI.
          </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Chat with MomsCare AI, track your pregnancy, upload prescriptions, and get answers from approved doctors — all in one place.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Link href="/chat" className="btn-primary w-full md:w-auto">
              Chat with MomsCare
            </Link>
            <Link href="/mother/register" className="btn-secondary w-full md:w-auto">
              I&apos;m a mother
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "AI chatbot tuned for pregnancy safety",
            "Doctor answers with profile-aware context",
            "Secure prescription uploads to Cloudflare R2",
          ].map((item) => (
            <div key={item} className="card">
              <p className="text-sm font-semibold text-pink-500">Feature</p>
              <p className="mt-2 text-base text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="card">
          <h3 className="text-xl font-semibold">Mothers</h3>
          <p className="mt-2 text-slate-600">
            Register, manage your pregnancy profile, upload prescriptions, and ask doctors private questions.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/mother/register" className="btn-primary">
              Register
            </Link>
            <Link href="/mother/login" className="btn-secondary">
              Login
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold">Doctors</h3>
          <p className="mt-2 text-slate-600">
            Apply for approval, review mother questions, and provide timely, compassionate answers.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/doctor/register" className="btn-primary">
              Apply
            </Link>
            <Link href="/doctor/login" className="btn-secondary">
              Doctor Login
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold">Admin</h3>
          <p className="mt-2 text-slate-600">
            Approve doctors, oversee activity, and track adoption stats across MomsCare.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/admin/login" className="btn-primary">
              Admin Login
            </Link>
          </div>
        </div>
      </section>
      </main>
  );
}

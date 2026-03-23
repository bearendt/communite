// apps/web/app/onboarding/verify-phone/page.tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function VerifyPhonePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"enter" | "verify" | "done">("enter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Holds the Clerk phone number object after creation
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);

  async function sendCode() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Create the phone number on the Clerk user
      const phoneObj = await user.createPhoneNumber({ phoneNumber: phone });
      setPhoneNumberId(phoneObj.id);
      // Trigger OTP
      await phoneObj.prepareVerification();
      setStep("verify");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send verification code. Check the number and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!user || !phoneNumberId) return;
    setLoading(true);
    setError(null);

    try {
      const phoneObj = user.phoneNumbers.find((p) => p.id === phoneNumberId);
      if (!phoneObj) throw new Error("Phone number not found");

      await phoneObj.attemptVerification({ code });

      // Sync to DB
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneVerified: true }),
      });

      setStep("done");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) return null;

  if (step === "done") {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-lg font-semibold text-stone-900">Phone verified!</h2>
          <p className="text-sm text-stone-500 mt-1">Redirecting you to dashboard…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">📱</div>
          <h1 className="text-xl font-semibold text-stone-900">
            {step === "enter" ? "Verify your phone" : "Enter the code"}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {step === "enter"
              ? "Required to RSVP and host events. We never share your number."
              : `Enter the 6-digit code sent to ${phone}`}
          </p>
        </div>

        {step === "enter" && (
          <div className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={(e: any) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              onClick={sendCode}
              disabled={loading || phone.length < 10}
              className="w-full bg-stone-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full text-stone-400 text-sm py-2 hover:text-stone-600"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e: any) => setCode(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              placeholder="000000"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              className="w-full bg-stone-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
            <button
              onClick={() => { setStep("enter"); setError(null); setCode(""); }}
              className="w-full text-stone-400 text-sm py-2 hover:text-stone-600"
            >
              Use a different number
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

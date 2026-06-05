import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0C172F", fontFamily: "'Figtree', sans-serif" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <img
            src="https://dentifier.b-cdn.net/logo/dentifier-logo-strap-white2.svg"
            alt="Dentifier"
            style={{ width: "180px", height: "auto" }}
          />
        </div>

        {/* Card */}
        <div className="rounded-lg p-8" style={{ backgroundColor: "#030F28" }}>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome back</h1>
          <p className="text-center text-gray-400 mb-8">Log in to your account</p>
          <Button
            onClick={handleGoogle}
            className="w-full h-12 text-sm font-medium mb-6"
            style={{ backgroundColor: "white", color: "#1a1a1a" }}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "#1e293b" }} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 text-gray-400" style={{ backgroundColor: "#030F28" }}>or</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 text-white"
                  style={{
                    backgroundColor: "#0C172F",
                    borderColor: "#3f4a52",
                    color: "white"
                  }}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium hover:opacity-80" style={{ color: "#D1D5DB" }} onMouseEnter={(e) => e.target.style.color = "#F2034D"} onMouseLeave={(e) => e.target.style.color = "#D1D5DB"}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 text-white"
                  style={{
                    backgroundColor: "#0C172F",
                    borderColor: "#3f4a52",
                    color: "white"
                  }}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 font-medium text-white" style={{ backgroundColor: "#F2034D" }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium hover:opacity-80" style={{ color: "#F2034D" }}>
              Create one
            </Link>
          </p>
          </div>
          </div>
          </div>
          );
          }
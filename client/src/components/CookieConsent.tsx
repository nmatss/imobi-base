import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { X, Settings } from "lucide-react";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

const COOKIE_CONSENT_KEY = "imobibase_cookie_consent";
const COOKIE_VERSION = "1.0.0";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true
    analytics: false,
    marketing: false,
    personalization: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setIsVisible(true), 1000);
    } else {
      const parsed = JSON.parse(savedConsent);
      if (parsed.version !== COOKIE_VERSION) {
        // New version, ask for consent again
        setIsVisible(true);
      }
    }
  }, []);

  const savePreferences = async (prefs: CookiePreferences) => {
    const consent = {
      version: COOKIE_VERSION,
      preferences: prefs,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));

    // Send to backend
    try {
      const sessionId = getOrCreateSessionId();
      await fetch("/api/compliance/cookie-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          preferences: prefs,
          consentVersion: COOKIE_VERSION,
        }),
      });
    } catch (error) {
      console.error("Failed to save cookie consent:", error);
    }

    // Apply preferences
    applyPreferences(prefs);
    setIsVisible(false);
  };

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      personalization: true,
    };
    savePreferences(allAccepted);
  };

  const acceptEssential = () => {
    savePreferences(preferences);
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  const applyPreferences = (prefs: CookiePreferences) => {
    // Initialize Google Analytics only if analytics consent given
    if (prefs.analytics && typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }

    // Initialize marketing scripts only if marketing consent given
    if (prefs.marketing) {
      // Enable marketing cookies
    }

    // Apply personalization preferences
    if (prefs.personalization) {
      // Enable personalization features
    }
  };

  const getOrCreateSessionId = (): string => {
    let sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("session_id", sessionId);
    }
    return sessionId;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900">
                Cookies & Privacidade
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Utilizamos cookies para melhorar sua experiência, personalizar conteúdo e analisar
              o tráfego do site. Seus dados são protegidos conforme a{" "}
              <a href="/legal/privacy" className="text-blue-600 hover:underline">
                LGPD
              </a>{" "}
              e{" "}
              <a href="/legal/privacy" className="text-blue-600 hover:underline">
                Política de Privacidade
              </a>
              .
            </p>

            {/* Cookie Details */}
            {showDetails && (
              <div className="space-y-3 border-t pt-4">
                {/* Essential Cookies */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      Cookies Essenciais
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Necessários para o funcionamento básico do site. Não podem ser desativados.
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      Cookies de Análise
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Nos ajudam a entender como os visitantes interagem com o site.
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      Cookies de Marketing
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Utilizados para exibir anúncios relevantes e medir campanhas.
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) =>
                        setPreferences({ ...preferences, marketing: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>

                {/* Personalization Cookies */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      Cookies de Personalização
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Permitem que o site lembre suas preferências e personalize sua experiência.
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={preferences.personalization}
                      onChange={(e) =>
                        setPreferences({ ...preferences, personalization: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              {!showDetails ? (
                <>
                  <Button onClick={acceptAll} className="flex-1">
                    Aceitar Todos
                  </Button>
                  <Button onClick={acceptEssential} variant="outline" className="flex-1">
                    Apenas Essenciais
                  </Button>
                  <Button
                    onClick={() => setShowDetails(true)}
                    variant="ghost"
                    className="flex-1"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Personalizar
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={saveCustom} className="flex-1">
                    Salvar Preferências
                  </Button>
                  <Button
                    onClick={() => setShowDetails(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                </>
              )}
            </div>

            {/* Policy Links */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              <a href="/legal/privacy" className="hover:underline">
                Política de Privacidade
              </a>
              {" • "}
              <a href="/legal/cookies" className="hover:underline">
                Política de Cookies
              </a>
              {" • "}
              <a href="/legal/lgpd-rights" className="hover:underline">
                Seus Direitos (LGPD)
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Hook for using cookie consent in components
export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent) {
      const parsed = JSON.parse(savedConsent);
      setPreferences(parsed.preferences);
    }
  }, []);

  const hasConsent = (type: keyof CookiePreferences): boolean => {
    return preferences?.[type] ?? false;
  };

  return { preferences, hasConsent };
}

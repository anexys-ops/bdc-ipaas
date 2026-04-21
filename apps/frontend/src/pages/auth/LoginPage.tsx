import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { LogIn, Shield, Zap } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/auth.store';
import { isKeycloakConfigured } from '../../lib/keycloak-config';
import { getKeycloak } from '../../lib/keycloak';

const loginSchema = z.object({
  email: z.string().transform((s) => s.trim().toLowerCase()).pipe(z.string().email('Email invalide')),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const keycloakEnabled = isKeycloakConfigured();
  const [kcReady, setKcReady] = useState(!keycloakEnabled);
  const [kcBusy, setKcBusy] = useState(false);
  const exchangedRef = useRef(false);

  const exchangeKeycloakToken = useCallback(
    async (token: string) => {
      const response = await authApi.keycloakLogin(token);
      if (!response?.user || !response?.accessToken) {
        toast.error('Réponse invalide du serveur');
        return;
      }
      setAuth(response.user, response.accessToken);
      toast.success('Connexion Keycloak réussie');
      navigate('/dashboard');
    },
    [navigate, setAuth],
  );

  useEffect(() => {
    if (!keycloakEnabled) return;

    let cancelled = false;
    const kc = getKeycloak();

    kc.init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false })
      .then(async (authenticated) => {
        if (cancelled) return;
        setKcReady(true);
        if (!authenticated || !kc.token || exchangedRef.current) return;
        exchangedRef.current = true;
        setKcBusy(true);
        try {
          await exchangeKeycloakToken(kc.token);
        } catch (error: unknown) {
          exchangedRef.current = false;
          const message =
            error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error);
          toast.error(message || 'Échec de la liaison Keycloak avec l’API');
        } finally {
          setKcBusy(false);
        }
      })
      .catch(() => {
        if (!cancelled) setKcReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [exchangeKeycloakToken, keycloakEnabled]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => authApi.login(data.email, data.password),
    onSuccess: (response) => {
      if (!response?.user || !response?.accessToken) {
        toast.error('Réponse invalide du serveur');
        return;
      }
      setAuth(response.user, response.accessToken);
      toast.success('Connexion réussie');
      navigate('/dashboard');
    },
    onError: (error: unknown) => {
      const message =
        (error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)) ||
        'Erreur de connexion';
      if (message.includes('fetch') || message === 'Failed to fetch' || message === 'NetworkError') {
        toast.error(
          'Impossible de joindre l\'API. Vérifiez que l\'API est démarrée (port 3000) et que VITE_API_URL pointe vers http://localhost:3000/api/v1',
        );
      } else if (message.includes('mot de passe incorrect') || message.includes('Email ou mot de passe')) {
        toast.error(
          'Email ou mot de passe incorrect. Vérifiez vos identifiants ou créez un compte d\'essai. Après installation, exécutez le seed API (voir ACCES.md) pour un compte de démo.',
        );
      } else {
        toast.error(message);
      }
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleKeycloakClick = async () => {
    setKcBusy(true);
    try {
      const kc = getKeycloak();
      if (!kcReady) {
        await kc.init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false });
        setKcReady(true);
      }
      await kc.login({ redirectUri: `${window.location.origin}/login` });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Impossible d’ouvrir Keycloak';
      toast.error(message);
      setKcBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 items-center justify-center p-4 py-8 relative z-[1]">
      <Card className="relative w-full max-w-md bg-white/95 border border-slate-200/80 shadow-lg animate-fadeIn">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-300 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl text-slate-800">Ultimate Edicloud</CardTitle>
          <CardDescription className="text-slate-600">
            Connectez-vous pour gérer vos intégrations
          </CardDescription>
        </CardHeader>

        <CardContent>
          {keycloakEnabled ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!kcReady || kcBusy}
                loading={kcBusy}
                onClick={() => void handleKeycloakClick()}
              >
                <Shield className="w-4 h-4 mr-2" />
                Se connecter avec Keycloak
              </Button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="bg-white/95 px-2 text-slate-400">ou par email</span>
                </div>
              </div>
            </>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@exemple.fr"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full" loading={loginMutation.isPending}>
              <LogIn className="w-4 h-4 mr-2" />
              Se connecter
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              to="/signup-trial"
              className="text-sm text-primary-600 hover:text-primary-500 font-medium transition-colors block"
            >
              Créer votre compte d&apos;essai →
            </Link>
            <Link to="/marketplace" className="text-sm text-slate-500 hover:text-slate-600 transition-colors block">
              Explorer le Marketplace
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus, Zap } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/auth.store';

const signupSchema = z.object({
  companyName: z.string().min(2, 'Au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
});

type SignupForm = z.infer<typeof signupSchema>;

export function SignupTrialPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const signupMutation = useMutation({
    mutationFn: (data: SignupForm) => authApi.signupTrial(data),
    onSuccess: (response) => {
      if (!response?.user || !response?.accessToken) {
        toast.error('Réponse invalide du serveur');
        return;
      }
      setAuth(response.user, response.accessToken);
      toast.success('Compte d\'essai créé. Bienvenue !');
      navigate('/dashboard');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erreur lors de la création du compte';
      if (message.includes('fetch') || message === 'Failed to fetch' || message === 'NetworkError') {
        toast.error(
          'Impossible de joindre l\'API. Vérifiez que l\'API est démarrée (port 3000) et que VITE_API_URL pointe vers http://localhost:3000/api/v1',
        );
      } else {
        toast.error(message);
      }
    },
  });

  const onSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-bg-mesh relative overflow-hidden p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary-200/50 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pastel-lavender/60 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pastel-mint/40 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md bg-white/95 border border-slate-200/80 shadow-lg animate-fadeIn">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-300 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl text-slate-800">ANEXYS iPaaS</CardTitle>
          <CardDescription className="text-slate-600">
            Créez votre compte d&apos;essai
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nom de l'entreprise ou du projet"
              placeholder="Ma Société"
              error={errors.companyName?.message}
              {...register('companyName')}
            />
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
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                placeholder="Jean"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Nom"
                placeholder="Dupont"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={signupMutation.isPending}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Créer mon compte d&apos;essai
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

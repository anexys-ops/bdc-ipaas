import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/auth.store';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

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
      setAuth(response.user, response.accessToken);
      toast.success('Connexion réussie');
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur de connexion');
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
            <LogIn className="w-6 h-6 text-primary-600" />
          </div>
          <CardTitle>Connexion à ANEXYS</CardTitle>
          <CardDescription>
            Plateforme d'intégration multi-tenant
          </CardDescription>
        </CardHeader>

        <CardContent>
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

            <Button
              type="submit"
              className="w-full"
              loading={loginMutation.isPending}
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/marketplace"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Explorer le Marketplace →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

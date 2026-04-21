import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Calendar, Zap, ArrowLeft } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { demoApi } from '../../api/demo';

const requestDemoSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().optional(),
  email: z.string().email('Email invalide'),
  company: z.string().optional(),
  message: z.string().max(2000).optional(),
});

type RequestDemoForm = z.infer<typeof requestDemoSchema>;

export function ReserverDemoPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RequestDemoForm>({
    resolver: zodResolver(requestDemoSchema),
  });

  const requestMutation = useMutation({
    mutationFn: (data: RequestDemoForm) => demoApi.requestDemo(data),
    onSuccess: () => {
      toast.success('Votre demande a bien été envoyée. Notre équipe commerciale vous recontactera rapidement.');
      reset();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi';
      if (message.includes('fetch') || message === 'Failed to fetch' || message === 'NetworkError') {
        toast.error('Impossible de joindre le serveur. Réessayez plus tard.');
      } else {
        toast.error(message);
      }
    },
  });

  const onSubmit = (data: RequestDemoForm) => {
    requestMutation.mutate(data);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 page-bg-mesh relative overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-4 py-8 relative min-h-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary-200/50 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pastel-lavender/60 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pastel-mint/40 rounded-full blur-3xl" />
        </div>

        <Card className="relative w-full max-w-md bg-white/95 border border-slate-200/80 shadow-lg animate-fadeIn">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-300 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl text-slate-800">Réserver une démo</CardTitle>
            <CardDescription className="text-slate-600">
              Renseignez vos coordonnées. Notre équipe vous recontactera pour planifier une démonstration Ultimate Edicloud.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Input
                label="Email"
                type="email"
                placeholder="contact@exemple.fr"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Société (optionnel)"
                placeholder="Ma Société SAS"
                error={errors.company?.message}
                {...register('company')}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message (optionnel)
                </label>
                <textarea
                  {...register('message')}
                  placeholder="Décrivez brièvement votre besoin ou vos questions..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all resize-none"
                />
                {errors.message?.message && (
                  <p className="mt-1 text-sm text-red-500">{errors.message.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={requestMutation.isPending}
              >
                <Zap className="w-4 h-4 mr-2" />
                Envoyer ma demande
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              <Link to="/" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-500 font-medium">
                <ArrowLeft className="w-4 h-4" />
                Retour à l&apos;accueil
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Upload,
  Palette,
  Users,
  Database,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
} from 'lucide-react';

interface WelcomeWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => void;
}

export interface OnboardingData {
  companyName: string;
  logo?: string;
  primaryColor: string;
  businessType: 'agency' | 'manager' | 'investor';
  teamMembers: Array<{ email: string; role: string }>;
  loadSampleData: boolean;
  skipTour: boolean;
}

const STEPS = 5;
const BUSINESS_TYPES = ['agency', 'manager', 'investor'] as const;
const ROLES = ['admin', 'agent', 'viewer'] as const;

const PRIMARY_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
];

export function WelcomeWizard({ open, onClose, onComplete }: WelcomeWizardProps) {
  const { t } = useTranslation('onboarding');
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    companyName: '',
    primaryColor: PRIMARY_COLORS[0].value,
    businessType: 'agency',
    teamMembers: [],
    loadSampleData: true,
    skipTour: false,
  });

  const [currentEmail, setCurrentEmail] = useState('');
  const [currentRole, setCurrentRole] = useState<string>('agent');

  const progress = (step / STEPS) * 100;

  const handleNext = () => {
    if (step < STEPS) {
      setStep(step + 1);
    } else {
      onComplete(data);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const addTeamMember = () => {
    if (currentEmail && currentEmail.includes('@')) {
      setData({
        ...data,
        teamMembers: [...data.teamMembers, { email: currentEmail, role: currentRole }],
      });
      setCurrentEmail('');
      setCurrentRole('agent');
    }
  };

  const removeTeamMember = (index: number) => {
    setData({
      ...data,
      teamMembers: data.teamMembers.filter((_, i) => i !== index),
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.companyName.trim().length > 0;
      case 2:
        return true;
      case 3:
        return true; // Team is optional
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            {t('welcome_title')}
          </DialogTitle>
          <p className="text-muted-foreground">{t('welcome_subtitle')}</p>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {t('progress')}: {step}/{STEPS}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="py-6">
          {/* Step 1: Company Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Building2 className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-semibold">{t('step_1_title')}</h3>
                <p className="text-muted-foreground">{t('step_1_description')}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('company_name_label')}</Label>
                  <Input
                    id="companyName"
                    placeholder={t('company_name_placeholder')}
                    value={data.companyName}
                    onChange={(e) => setData({ ...data, companyName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('upload_logo')}</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('choose_color')}</Label>
                  <div className="grid grid-cols-6 gap-3">
                    {PRIMARY_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-12 h-12 rounded-lg border-2 transition-all ${
                          data.primaryColor === color.value
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setData({ ...data, primaryColor: color.value })}
                        title={color.name}
                      >
                        {data.primaryColor === color.value && (
                          <Check className="h-6 w-6 text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Business Type */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Palette className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-semibold">{t('step_2_title')}</h3>
                <p className="text-muted-foreground">{t('step_2_description')}</p>
              </div>

              <div className="grid gap-4">
                {BUSINESS_TYPES.map((type) => (
                  <Card
                    key={type}
                    className={`cursor-pointer transition-all ${
                      data.businessType === type
                        ? 'border-primary shadow-md'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setData({ ...data, businessType: type })}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          data.businessType === type ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <Building2
                          className={`h-6 w-6 ${
                            data.businessType === type ? 'text-white' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{t(`business_type_${type}`)}</h4>
                        <p className="text-sm text-muted-foreground">
                          {type === 'agency' && 'Gestione imóveis, leads e vendas'}
                          {type === 'manager' && 'Administre aluguéis e propriedades'}
                          {type === 'investor' && 'Acompanhe investimentos imobiliários'}
                        </p>
                      </div>
                      {data.businessType === type && (
                        <Check className="h-6 w-6 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Team Setup */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Users className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-semibold">{t('step_3_title')}</h3>
                <p className="text-muted-foreground">{t('step_3_description')}</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder={t('email_placeholder')}
                      value={currentEmail}
                      onChange={(e) => setCurrentEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTeamMember()}
                    />
                  </div>
                  <select
                    className="border rounded-md px-3 py-2 bg-background"
                    value={currentRole}
                    onChange={(e) => setCurrentRole(e.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {t(`role_${role}`)}
                      </option>
                    ))}
                  </select>
                  <Button onClick={addTeamMember} type="button">
                    Add
                  </Button>
                </div>

                {data.teamMembers.length > 0 && (
                  <div className="space-y-2">
                    {data.teamMembers.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {member.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.email}</p>
                            <Badge variant="secondary" className="text-xs">
                              {t(`role_${member.role}`)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTeamMember(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {data.teamMembers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('invite_team_members')}</p>
                  </div>
                )}

                <Button variant="link" className="w-full" onClick={handleNext}>
                  {t('skip_team_setup')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Sample Data */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Database className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-semibold">{t('step_4_title')}</h3>
                <p className="text-muted-foreground">{t('step_4_description')}</p>
              </div>

              <div className="grid gap-4">
                <Card
                  className={`cursor-pointer transition-all ${
                    data.loadSampleData
                      ? 'border-primary shadow-md'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setData({ ...data, loadSampleData: true })}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          data.loadSampleData ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <Database
                          className={`h-6 w-6 ${
                            data.loadSampleData ? 'text-white' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{t('load_sample_data')}</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            {t('sample_properties')}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            {t('sample_leads')}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            {t('sample_visits')}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            {t('sample_contracts')}
                          </li>
                        </ul>
                      </div>
                      {data.loadSampleData && <Check className="h-6 w-6 text-primary" />}
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    !data.loadSampleData
                      ? 'border-primary shadow-md'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setData({ ...data, loadSampleData: false })}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          !data.loadSampleData ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <Sparkles
                          className={`h-6 w-6 ${
                            !data.loadSampleData ? 'text-white' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{t('start_fresh')}</h4>
                        <p className="text-sm text-muted-foreground">
                          Começar com uma base limpa
                        </p>
                      </div>
                      {!data.loadSampleData && <Check className="h-6 w-6 text-primary" />}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 5: Quick Tour */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Sparkles className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-semibold">{t('step_5_title')}</h3>
                <p className="text-muted-foreground">{t('step_5_description')}</p>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('tour_dashboard_title')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('tour_dashboard_content')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('tour_properties_title')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('tour_properties_content')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('tour_leads_title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('tour_leads_content')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('tour_calendar_title')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('tour_calendar_content')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setData({ ...data, skipTour: true })}
                  className={data.skipTour ? 'border-primary' : ''}
                >
                  {t('skip_tour')}
                </Button>
                <Button
                  onClick={() => setData({ ...data, skipTour: false })}
                  className={!data.skipTour ? '' : 'variant-outline'}
                >
                  {t('start_tour')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onClick={handleSkip} className="gap-2">
            <X className="h-4 w-4" />
            {t('skip', { ns: 'common' })}
          </Button>

          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                {t('previous', { ns: 'common' })}
              </Button>
            )}
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              {step === STEPS ? t('complete_setup') : t('next', { ns: 'common' })}
              {step < STEPS && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

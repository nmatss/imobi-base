import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';

interface ProductTourProps {
  run: boolean;
  onComplete: () => void;
  tourType?: 'main' | 'dashboard' | 'properties' | 'leads' | 'calendar' | 'reports';
}

export function ProductTour({ run, onComplete, tourType = 'main' }: ProductTourProps) {
  const { t } = useTranslation('onboarding');
  const [runTour, setRunTour] = useState(run);

  useEffect(() => {
    setRunTour(run);
  }, [run]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;

    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      onComplete();
    }

    // Log tour events
    if (type === EVENTS.TOUR_END && status === STATUS.SKIPPED) {
      localStorage.setItem(`tour_skipped_${tourType}`, 'true');
    } else if (type === EVENTS.TOUR_END && status === STATUS.FINISHED) {
      localStorage.setItem(`tour_completed_${tourType}`, 'true');
    }
  };

  const mainTourSteps: Step[] = [
    {
      target: '[data-tour="dashboard"]',
      content: t('tour_dashboard_content'),
      title: t('tour_dashboard_title'),
      disableBeacon: true,
      placement: 'right',
    },
    {
      target: '[data-tour="properties"]',
      content: t('tour_properties_content'),
      title: t('tour_properties_title'),
      placement: 'right',
    },
    {
      target: '[data-tour="leads"]',
      content: t('tour_leads_content'),
      title: t('tour_leads_title'),
      placement: 'right',
    },
    {
      target: '[data-tour="calendar"]',
      content: t('tour_calendar_content'),
      title: t('tour_calendar_title'),
      placement: 'right',
    },
    {
      target: '[data-tour="reports"]',
      content: t('tour_reports_content'),
      title: t('tour_reports_title'),
      placement: 'right',
    },
    {
      target: '[data-tour="global-search"]',
      content: 'Use a busca global para encontrar rapidamente imóveis, leads e mais',
      title: 'Busca Global',
      placement: 'bottom',
    },
    {
      target: '[data-tour="settings"]',
      content: 'Configure sua conta, equipe e integrações aqui',
      title: 'Configurações',
      placement: 'left',
    },
  ];

  const dashboardTourSteps: Step[] = [
    {
      target: '[data-tour="stats-cards"]',
      content: 'Acompanhe suas métricas principais em tempo real',
      title: 'Estatísticas em Tempo Real',
      disableBeacon: true,
    },
    {
      target: '[data-tour="quick-actions"]',
      content: 'Acesse ações rápidas para agilizar seu trabalho',
      title: 'Ações Rápidas',
    },
    {
      target: '[data-tour="recent-activities"]',
      content: 'Veja as atividades mais recentes do sistema',
      title: 'Atividades Recentes',
    },
  ];

  const propertiesTourSteps: Step[] = [
    {
      target: '[data-tour="add-property"]',
      content: 'Clique aqui para adicionar um novo imóvel',
      title: 'Adicionar Imóvel',
      disableBeacon: true,
    },
    {
      target: '[data-tour="filters"]',
      content: 'Use filtros para encontrar imóveis específicos',
      title: 'Filtros',
    },
    {
      target: '[data-tour="property-card"]',
      content: 'Clique em um imóvel para ver todos os detalhes',
      title: 'Detalhes do Imóvel',
    },
  ];

  const leadsTourSteps: Step[] = [
    {
      target: '[data-tour="kanban-board"]',
      content: 'Arraste e solte leads entre os estágios do funil',
      title: 'Quadro Kanban',
      disableBeacon: true,
    },
    {
      target: '[data-tour="add-lead"]',
      content: 'Adicione novos leads aqui',
      title: 'Novo Lead',
    },
    {
      target: '[data-tour="lead-filters"]',
      content: 'Filtre leads por origem, status e mais',
      title: 'Filtros de Lead',
    },
  ];

  const calendarTourSteps: Step[] = [
    {
      target: '[data-tour="calendar-view"]',
      content: 'Visualize todos os seus compromissos',
      title: 'Calendário',
      disableBeacon: true,
    },
    {
      target: '[data-tour="schedule-visit"]',
      content: 'Agende visitas e reuniões rapidamente',
      title: 'Agendar Visita',
    },
    {
      target: '[data-tour="view-toggle"]',
      content: 'Alterne entre visualizações de dia, semana e mês',
      title: 'Visualizações',
    },
  ];

  const reportsTourSteps: Step[] = [
    {
      target: '[data-tour="report-types"]',
      content: 'Escolha o tipo de relatório que deseja gerar',
      title: 'Tipos de Relatório',
      disableBeacon: true,
    },
    {
      target: '[data-tour="date-range"]',
      content: 'Selecione o período para o relatório',
      title: 'Período',
    },
    {
      target: '[data-tour="export-options"]',
      content: 'Exporte relatórios em PDF ou Excel',
      title: 'Exportar',
    },
  ];

  const getStepsByTourType = (): Step[] => {
    switch (tourType) {
      case 'dashboard':
        return dashboardTourSteps;
      case 'properties':
        return propertiesTourSteps;
      case 'leads':
        return leadsTourSteps;
      case 'calendar':
        return calendarTourSteps;
      case 'reports':
        return reportsTourSteps;
      default:
        return mainTourSteps;
    }
  };

  return (
    <Joyride
      steps={getStepsByTourType()}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          arrowColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '8px',
          padding: '20px',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: '6px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
      locale={{
        back: t('previous', { ns: 'common' }),
        close: t('close', { ns: 'common' }),
        last: t('finish', { ns: 'common' }),
        next: t('next', { ns: 'common' }),
        skip: t('skip', { ns: 'common' }),
      }}
    />
  );
}

// Hook to check if tour was completed
export function useTourCompleted(tourType: string = 'main'): boolean {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const isCompleted = localStorage.getItem(`tour_completed_${tourType}`) === 'true';
    const isSkipped = localStorage.getItem(`tour_skipped_${tourType}`) === 'true';
    setCompleted(isCompleted || isSkipped);
  }, [tourType]);

  return completed;
}

// Hook to reset tour
export function useResetTour() {
  return (tourType: string = 'main') => {
    localStorage.removeItem(`tour_completed_${tourType}`);
    localStorage.removeItem(`tour_skipped_${tourType}`);
  };
}

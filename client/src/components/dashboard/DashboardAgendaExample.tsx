/**
 * EXEMPLO DE USO: DashboardAgenda e DashboardRecentActivity
 *
 * Este arquivo demonstra como usar os componentes criados pelo AGENTE 6
 */

import { useState } from 'react';
import { DashboardAgenda, AgendaItem } from './DashboardAgenda';
import { DashboardRecentActivity, Activity } from './DashboardRecentActivity';

// ========================================
// EXEMPLO 1: DashboardAgenda
// ========================================

export function AgendaExample() {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    {
      id: '1',
      type: 'visit',
      time: '09:00',
      client: 'João Silva',
      property: 'Apartamento 3 quartos - Asa Sul',
      status: 'pending',
      completed: false,
    },
    {
      id: '2',
      type: 'followup',
      time: '10:30',
      client: 'Maria Santos',
      status: 'pending',
      completed: false,
    },
    {
      id: '3',
      type: 'visit',
      time: '14:00',
      client: 'Pedro Oliveira',
      property: 'Casa 4 quartos - Lago Sul',
      status: 'overdue',
      completed: false,
    },
    {
      id: '4',
      type: 'followup',
      time: '16:00',
      client: 'Ana Costa',
      status: 'completed',
      completed: true,
    },
    {
      id: '5',
      type: 'visit',
      time: '17:30',
      client: 'Carlos Mendes',
      property: 'Cobertura - Águas Claras',
      status: 'pending',
      completed: false,
    },
  ]);

  const handleToggleComplete = (id: string) => {
    setAgendaItems(items =>
      items.map(item =>
        item.id === id
          ? {
              ...item,
              completed: !item.completed,
              status: !item.completed ? 'completed' : 'pending'
            }
          : item
      )
    );
  };

  return (
    <div className="max-w-md">
      <DashboardAgenda
        items={agendaItems}
        onToggleComplete={handleToggleComplete}
        maxItems={5}
      />
    </div>
  );
}

// ========================================
// EXEMPLO 2: DashboardRecentActivity
// ========================================

export function RecentActivityExample() {
  const activities: Activity[] = [
    {
      id: '1',
      type: 'lead',
      description: 'Novo lead adicionado: Roberto Almeida interessado em apartamento',
      user: 'Sistema',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
    },
    {
      id: '2',
      type: 'property',
      description: 'Novo imóvel cadastrado: Casa 5 quartos em Sobradinho',
      user: 'Carlos Ferreira',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    },
    {
      id: '3',
      type: 'visit',
      description: 'Visita agendada com Mariana Lima para apartamento na Asa Norte',
      user: 'Ana Paula',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 horas atrás
    },
    {
      id: '4',
      type: 'proposal',
      description: 'Proposta enviada para José Santos - Cobertura Lago Sul',
      user: 'Ricardo Souza',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    },
    {
      id: '5',
      type: 'contract',
      description: 'Contrato assinado: Apartamento Asa Sul vendido para Paula Rodrigues',
      user: 'Fernanda Costa',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
    },
  ];

  return (
    <div className="max-w-md">
      <DashboardRecentActivity
        activities={activities}
        maxItems={5}
      />
    </div>
  );
}

// ========================================
// EXEMPLO 3: Uso Combinado no Dashboard
// ========================================

export function DashboardWithAgendaAndActivity() {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    {
      id: '1',
      type: 'visit',
      time: '09:00',
      client: 'João Silva',
      property: 'Apartamento 3 quartos - Asa Sul',
      status: 'pending',
      completed: false,
    },
    {
      id: '2',
      type: 'followup',
      time: '10:30',
      client: 'Maria Santos',
      status: 'pending',
      completed: false,
    },
  ]);

  const activities: Activity[] = [
    {
      id: '1',
      type: 'lead',
      description: 'Novo lead adicionado: Roberto Almeida',
      user: 'Sistema',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: '2',
      type: 'contract',
      description: 'Contrato assinado com Paula Rodrigues',
      user: 'Fernanda Costa',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  ];

  const handleToggleComplete = (id: string) => {
    setAgendaItems(items =>
      items.map(item =>
        item.id === id
          ? {
              ...item,
              completed: !item.completed,
              status: !item.completed ? 'completed' : 'pending'
            }
          : item
      )
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Coluna Esquerda: Agenda */}
      <DashboardAgenda
        items={agendaItems}
        onToggleComplete={handleToggleComplete}
      />

      {/* Coluna Direita: Atividades */}
      <DashboardRecentActivity activities={activities} />
    </div>
  );
}

// ========================================
// EXEMPLO 4: Integração com API
// ========================================

export function DashboardWithAPI() {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Simula fetch de dados da API
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch agenda items
      const agendaResponse = await fetch('/api/agenda/today');
      const agendaData = await agendaResponse.json();
      setAgendaItems(agendaData);

      // Fetch recent activities
      const activitiesResponse = await fetch('/api/activities/recent');
      const activitiesData = await activitiesResponse.json();

      // Converter timestamps string para Date objects
      const processedActivities = activitiesData.map((activity: any) => ({
        ...activity,
        timestamp: new Date(activity.timestamp),
      }));
      setActivities(processedActivities);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   fetchData();
  // }, []);

  const handleToggleComplete = async (id: string) => {
    try {
      // Update local state optimistically
      setAgendaItems(items =>
        items.map(item =>
          item.id === id
            ? {
                ...item,
                completed: !item.completed,
                status: !item.completed ? 'completed' : 'pending'
              }
            : item
        )
      );

      // Sync with API
      await fetch(`/api/agenda/${id}/toggle`, {
        method: 'PATCH',
      });

    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      // Revert on error
      fetchData();
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DashboardAgenda
        items={agendaItems}
        onToggleComplete={handleToggleComplete}
      />
      <DashboardRecentActivity activities={activities} />
    </div>
  );
}

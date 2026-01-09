import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

// Basic Progress
export const Default: Story = {
  args: {
    value: 50,
  },
};

export const Empty: Story = {
  args: {
    value: 0,
  },
};

export const Full: Story = {
  args: {
    value: 100,
  },
};

// Different Values
export const LowProgress: Story = {
  args: {
    value: 25,
  },
};

export const MediumProgress: Story = {
  args: {
    value: 60,
  },
};

export const HighProgress: Story = {
  args: {
    value: 85,
  },
};

// Animated Progress
export const AnimatedProgress: Story = {
  render: () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const timer = setTimeout(() => setProgress(66), 500);
      return () => clearTimeout(timer);
    }, []);

    return <Progress value={progress} className="w-[60%]" />;
  },
};

// Loading Simulation
export const LoadingSimulation: Story = {
  render: () => {
    const [progress, setProgress] = useState(13);

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + 10;
        });
      }, 500);
      return () => clearInterval(timer);
    }, []);

    return (
      <div className="space-y-2">
        <Progress value={progress} className="w-[60%]" />
        <p className="text-sm text-muted-foreground">{progress}% completo</p>
      </div>
    );
  },
};

// Property Completeness Score
export const PropertyCompleteness: Story = {
  render: () => {
    const properties = [
      { title: 'Apartamento Centro', score: 90 },
      { title: 'Casa Jardim Europa', score: 75 },
      { title: 'Sala Comercial', score: 45 },
      { title: 'Terreno Industrial', score: 30 },
    ];

    return (
      <div className="space-y-6 w-full max-w-md">
        {properties.map((property, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{property.title}</span>
              <span className={`font-semibold ${
                property.score >= 70 ? 'text-green-600' :
                property.score >= 50 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {property.score}%
              </span>
            </div>
            <Progress
              value={property.score}
              className={
                property.score >= 70 ? '[&>div]:bg-green-500' :
                property.score >= 50 ? '[&>div]:bg-yellow-500' :
                '[&>div]:bg-red-500'
              }
            />
          </div>
        ))}
      </div>
    );
  },
};

// Upload Progress
export const UploadProgress: Story = {
  render: () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          return prev + 5;
        });
      }, 200);
      return () => clearInterval(timer);
    }, []);

    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Enviando Imagens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={progress} />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Uploading foto-01.jpg...</span>
            <span>{progress}%</span>
          </div>
        </CardContent>
      </Card>
    );
  },
};

// Multiple Progress Bars
export const MultipleProgressBars: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md">
      <div>
        <h3 className="text-sm font-medium mb-2">Metas do Mês</h3>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Imóveis Vendidos</span>
              <span>8/10</span>
            </div>
            <Progress value={80} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Novos Leads</span>
              <span>42/50</span>
            </div>
            <Progress value={84} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Visitas Agendadas</span>
              <span>15/20</span>
            </div>
            <Progress value={75} />
          </div>
        </div>
      </div>
    </div>
  ),
};

// Color Variants
export const ColorVariants: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Default (Primary)</p>
        <Progress value={60} />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Success (Green)</p>
        <Progress value={75} className="[&>div]:bg-green-500" />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Warning (Yellow)</p>
        <Progress value={50} className="[&>div]:bg-yellow-500" />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Error (Red)</p>
        <Progress value={30} className="[&>div]:bg-red-500" />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Info (Blue)</p>
        <Progress value={65} className="[&>div]:bg-blue-500" />
      </div>
    </div>
  ),
};

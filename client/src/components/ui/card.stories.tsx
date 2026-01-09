import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Building2, MapPin, Bed, Bath } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card with Footer</CardTitle>
        <CardDescription>This card has a footer with actions</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Continue</Button>
      </CardFooter>
    </Card>
  ),
};

export const PropertyCard: Story = {
  render: () => (
    <Card className="max-w-sm">
      <div className="h-48 bg-muted rounded-t-lg" />
      <CardHeader>
        <div className="flex gap-2 mb-2">
          <Badge variant="outline">Apartamento</Badge>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Disponível
          </Badge>
        </div>
        <CardTitle>Apartamento 3 quartos - Centro</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          São Paulo, SP
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span>3 quartos</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>2 banheiros</span>
          </div>
        </div>
        <div className="text-2xl font-bold">R$ 450.000</div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Ver Detalhes</Button>
      </CardFooter>
    </Card>
  ),
};

export const LeadCard: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>João Silva</CardTitle>
            <CardDescription>joao@email.com</CardDescription>
          </div>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Qualificado
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Telefone:</span>
            <span>(11) 99999-9999</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Origem:</span>
            <Badge variant="outline" className="text-xs">WhatsApp</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interesse:</span>
            <span>Apartamento 2 quartos</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1">Contatar</Button>
        <Button className="flex-1">Ver Mais</Button>
      </CardFooter>
    </Card>
  ),
};

export const StatsCard: Story = {
  render: () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">+12,234</div>
        <p className="text-xs text-muted-foreground">
          +19% em relação ao mês passado
        </p>
      </CardContent>
    </Card>
  ),
};

export const MultipleCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Card 1</CardTitle>
          <CardDescription>Description for card 1</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content 1</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Card 2</CardTitle>
          <CardDescription>Description for card 2</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content 2</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Card 3</CardTitle>
          <CardDescription>Description for card 3</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content 3</p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const InteractiveCard: Story = {
  render: () => (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <CardTitle>Clickable Card</CardTitle>
        <CardDescription>This card has hover effects</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Hover over this card to see the effect</p>
      </CardContent>
    </Card>
  ),
};

# AGENTE 13 - Referência Rápida

## Como Usar os Novos Componentes

### 1. SettingsFormField - Campo com Validação

```tsx
import { SettingsFormField } from "@/components/settings/SettingsFormField";

// Validação síncrona simples
<SettingsFormField
  label="Nome"
  name="name"
  value={name}
  onChange={setName}
  required
/>

// Validação com regex
<SettingsFormField
  label="Email"
  name="email"
  type="email"
  value={email}
  onChange={setEmail}
  validate={(value) => {
    if (!value.includes('@')) return 'Email inválido';
    return null;
  }}
  helperText="Usado para login"
  required
/>

// Validação assíncrona
<SettingsFormField
  label="Username"
  name="username"
  value={username}
  onChange={setUsername}
  validate={async (value) => {
    const exists = await checkUsernameExists(value);
    if (exists) return 'Username já em uso';
    return null;
  }}
/>

// Aviso (warning) em vez de erro
<SettingsFormField
  label="CRECI"
  name="creci"
  value={creci}
  onChange={setCreci}
  validate={(value) => {
    if (!value) return 'warning:CRECI não informado';
    return null;
  }}
/>

// Textarea
<SettingsFormField
  label="Bio"
  name="bio"
  type="textarea"
  value={bio}
  onChange={setBio}
  rows={4}
  maxLength={500}
/>
```

### 2. useAutoSave - Salvamento Automático

```tsx
import { useAutoSave } from "@/hooks/useAutoSave";

function MySettings() {
  const [formData, setFormData] = useState({ ... });

  const { isSaving, lastSaved, hasUnsavedChanges, saveNow } = useAutoSave({
    data: formData,
    onSave: async (data) => {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    delay: 2000,        // Aguarda 2s após última mudança
    enabled: true,      // Pode desabilitar temporariamente
    onSuccess: () => {
      toast({ title: "Salvo!" });
    },
    onError: (error) => {
      toast({ title: "Erro", variant: "destructive" });
    }
  });

  return (
    <div>
      {isSaving && <Spinner />}
      {lastSaved && <span>Salvo às {lastSaved.toLocaleTimeString()}</span>}
      {hasUnsavedChanges && <Badge>Não salvo</Badge>}
      <Button onClick={saveNow}>Salvar Agora</Button>
    </div>
  );
}
```

### 3. SettingsLayout - Layout de Navegação

```tsx
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { User, Shield, Bell } from "lucide-react";

const sections = [
  {
    id: "profile",
    label: "Perfil",
    icon: User,
    component: ProfileSettings,
    description: "Dados pessoais"
  },
  {
    id: "security",
    label: "Segurança",
    icon: Shield,
    component: SecuritySettings,
    description: "Senha e 2FA"
  },
  {
    id: "notifications",
    label: "Notificações",
    icon: Bell,
    component: NotificationSettings,
    description: "Alertas"
  }
];

function SettingsPage() {
  return (
    <SettingsLayout
      sections={sections}
      defaultSection="profile"
      onSectionChange={(id) => console.log(`Mudou para ${id}`)}
    />
  );
}
```

## Padrões de Validação

### Email
```tsx
const validateEmail = (email: string): string | null => {
  if (!email) return "Email é obrigatório";
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return "Email inválido";
  return null;
};
```

### Telefone Brasileiro
```tsx
const validatePhone = (phone: string): string | null => {
  if (!phone) return null;
  const numbers = phone.replace(/\D/g, "");
  if (numbers.length < 10 || numbers.length > 11) {
    return "Telefone inválido";
  }
  return null;
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
};
```

### CNPJ
```tsx
const validateCNPJ = (cnpj: string): string | null => {
  if (!cnpj) return null;
  const numbers = cnpj.replace(/\D/g, "");
  if (numbers.length !== 14) return "CNPJ inválido";
  return null;
};

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
};
```

### Senha Forte
```tsx
const validatePassword = (password: string): string | null => {
  if (!password) return "Senha é obrigatória";
  if (password.length < 8) return "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(password)) return "Precisa de letra maiúscula";
  if (!/[a-z]/.test(password)) return "Precisa de letra minúscula";
  if (!/\d/.test(password)) return "Precisa de número";

  const strength = calculateStrength(password);
  if (strength < 50) {
    return "warning:Senha fraca. Adicione caracteres especiais.";
  }

  return null;
};

const calculateStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 15;
  if (/[^A-Za-z0-9]/.test(password)) strength += 10;
  return Math.min(strength, 100);
};
```

### URL
```tsx
const validateURL = (url: string): string | null => {
  if (!url) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return "URL inválida";
  }
};
```

### URL de Rede Social
```tsx
const validateSocialURL = (url: string, platform: string): string | null => {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    const domains: Record<string, string[]> = {
      facebook: ["facebook.com", "fb.com"],
      instagram: ["instagram.com"],
      linkedin: ["linkedin.com"],
      youtube: ["youtube.com", "youtu.be"]
    };

    const validDomains = domains[platform.toLowerCase()] || [];
    const isValid = validDomains.some(d => hostname.includes(d));

    if (!isValid) return `URL deve ser do ${platform}`;
    return null;
  } catch {
    return "URL inválida";
  }
};
```

## Upload de Imagens

```tsx
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validar tamanho
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    toast({
      title: "Arquivo muito grande",
      description: "Máximo 2MB",
      variant: "destructive"
    });
    return;
  }

  // Validar tipo
  if (!file.type.startsWith("image/")) {
    toast({
      title: "Formato inválido",
      description: "Apenas imagens são permitidas",
      variant: "destructive"
    });
    return;
  }

  setIsUploading(true);

  try {
    // Criar preview local
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload real (implementar conforme seu backend)
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const { url } = await response.json();
    setImageUrl(url);

    toast({ title: "Imagem enviada com sucesso!" });
  } catch (error) {
    toast({
      title: "Erro no upload",
      variant: "destructive"
    });
  } finally {
    setIsUploading(false);
  }
};
```

## Componentes UI Necessários

Certifique-se de ter estes componentes do shadcn/ui instalados:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add card
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add scroll-area
```

## Estrutura de Dados

### Preferências de Notificação
```typescript
interface NotificationChannel {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
}

interface NotificationPreferences {
  newLeads: NotificationChannel;
  leadStatusChange: NotificationChannel;
  newVisit: NotificationChannel;
  // ... mais eventos
  quietHoursEnabled: boolean;
  quietHoursStart: string;  // "22:00"
  quietHoursEnd: string;    // "08:00"
}
```

### Dados do Perfil
```typescript
interface ProfileData {
  name: string;
  email: string;
  phone: string;
  creci: string;
  bio: string;
  avatar?: string;
}
```

### Dados da Empresa
```typescript
interface CompanyData {
  name: string;
  logo?: string;
  website: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
}
```

## Dicas de Uso

### 1. Debounce Customizado
```tsx
// Validação mais rápida
<SettingsFormField
  debounceMs={300}  // Padrão é 500ms
  ...
/>

// Auto-save mais lento
useAutoSave({
  delay: 5000,  // 5 segundos
  ...
});
```

### 2. Desabilitar Auto-Save Temporariamente
```tsx
const [enableAutoSave, setEnableAutoSave] = useState(false);

useAutoSave({
  data: formData,
  onSave: saveToAPI,
  enabled: enableAutoSave  // Controla quando ativa
});

// Ativar após carregar dados iniciais
useEffect(() => {
  loadInitialData().then(() => {
    setEnableAutoSave(true);
  });
}, []);
```

### 3. Forçar Salvamento Imediato
```tsx
const { saveNow } = useAutoSave({ ... });

// Em algum evento
<Button onClick={async () => {
  await saveNow();
  navigate('/dashboard');
}}>
  Salvar e Sair
</Button>
```

### 4. Validação Condicional
```tsx
<SettingsFormField
  validate={(value) => {
    // Só valida se campo está preenchido
    if (!value) return null;

    // Validação complexa
    if (someCondition) {
      return validateAsEmail(value);
    } else {
      return validateAsPhone(value);
    }
  }}
/>
```

## Troubleshooting

### Validação não está rodando
- Verifique se `touched` está true (usuário saiu do campo)
- Confirme que a função `validate` retorna string ou null
- Use debounce menor se quiser validação mais rápida

### Auto-save não funciona
- Verifique se `enabled` está true
- Confirme que os dados realmente mudaram (usa JSON.stringify)
- Veja se `onSave` está retornando Promise

### Layout quebrado em mobile
- Certifique-se que o container pai não tem `overflow: hidden`
- Verifique se Tailwind CSS está carregado
- Use DevTools para inspecionar media queries

### TypeScript erros
- Rode `npm run build` para ver erros específicos
- Verifique se todos os tipos estão importados
- Confirme que interfaces coincidem

## Recursos Adicionais

- **Documentação Completa:** `AGENT_13_SETTINGS_IMPROVEMENTS.md`
- **Sumário Executivo:** `AGENT_13_EXECUTIVE_SUMMARY.md`
- **Código Fonte:** `/client/src/components/settings/`
- **Exemplos de Uso:** Dentro de cada componente de seção

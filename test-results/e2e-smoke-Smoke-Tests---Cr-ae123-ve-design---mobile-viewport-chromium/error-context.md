# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img [ref=e8]
      - generic [ref=e12]: ImobiBase
    - generic [ref=e13]:
      - heading "Bem-vindo de volta" [level=2] [ref=e14]
      - paragraph [ref=e15]: Entre com suas credenciais para acessar o painel
    - generic [ref=e16]:
      - generic [ref=e17]:
        - text: Email
        - textbox "Email" [ref=e18]:
          - /placeholder: seu@email.com
          - text: admin@demo.com
      - generic [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]: Senha
          - link "Esqueceu?" [ref=e22] [cursor=pointer]:
            - /url: "#"
        - textbox "Senha" [ref=e23]: demo123
      - button "Entrar" [ref=e24] [cursor=pointer]
    - generic [ref=e29]: ou
    - paragraph [ref=e30]:
      - text: Não tem uma conta?
      - link "Criar conta grátis" [ref=e31] [cursor=pointer]:
        - /url: "#"
  - region "Notifications alt+T"
```
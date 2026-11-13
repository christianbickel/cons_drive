"use client";

import { useActionState } from "react";
import {
  loginWithPasswordAction,
  loginWithTwoFactorAction,
  type LoginActionResult,
} from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: LoginActionResult | null = null;

export function LoginForm({
  defaultApiUrl = "",
  nextPath = "/drive",
}: {
  defaultApiUrl?: string;
  nextPath?: string;
}) {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    loginWithPasswordAction,
    initial
  );
  const [twoFactorState, twoFactorAction, twoFactorPending] = useActionState(
    loginWithTwoFactorAction,
    initial
  );

  const needsTwoFactor =
    (passwordState?.ok === false && passwordState.needsTwoFactor) ||
    (twoFactorState?.ok === false && twoFactorState.needsTwoFactor);

  if (needsTwoFactor) {
    const error =
      (twoFactorState && !twoFactorState.ok && twoFactorState.error) ||
      (passwordState && !passwordState.ok && passwordState.error);
    return (
      <form action={twoFactorAction} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-1">
          <h2 className="text-base font-medium">Zwei-Faktor-Authentifizierung</h2>
          <p className="text-sm text-muted-foreground">
            Gib den Code aus deiner Authenticator-App ein.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={twoFactorPending}>
          {twoFactorPending ? "Prüfen…" : "Bestätigen"}
        </Button>
      </form>
    );
  }

  return (
    <form action={passwordAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <div className="grid gap-2">
        <Label htmlFor="apiUrl">Consolidate-URL</Label>
        <Input
          id="apiUrl"
          name="apiUrl"
          type="url"
          required
          defaultValue={defaultApiUrl}
          placeholder="https://staging.consi.cloud"
          autoComplete="url"
        />
        <p className="text-xs text-muted-foreground">
          Basis-URL der Instanz (mit oder ohne <code>/graphql</code>).
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="name@firma.de"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {passwordState && !passwordState.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {passwordState.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={passwordPending}>
        {passwordPending ? "Anmelden…" : "Anmelden"}
      </Button>
    </form>
  );
}

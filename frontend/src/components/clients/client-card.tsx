"use client";

import Link from "next/link";
import { Building, ChevronRight, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Client } from "@/types";
import { getClientHourlyRate, getClientLogoUrl } from "@/lib/client-utils";

interface ClientCardProps {
  client: Client;
}

export function ClientCard({ client }: ClientCardProps) {
  const initials = client.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const logoUrl = getClientLogoUrl(client);
  const hourlyRate = getClientHourlyRate(client);

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden ring-1 ring-primary/10">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={client.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {client.name}
                  </h3>
                  {!client.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Inactivo
                    </Badge>
                  )}
                  {hourlyRate !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      Tarifa configurada
                    </Badge>
                  )}
                </div>

                {client.company && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1 truncate">
                    <Building className="w-3 h-3" />
                    {client.company}
                  </p>
                )}

                <div className="mt-3 space-y-1">
                  {client.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </p>
                  )}
                  {(client.phone || client.whatsapp) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3" />
                      {client.phone || client.whatsapp}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

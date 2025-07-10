
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Users, Building, UserCheck } from "lucide-react";
import { AccountType } from "@/types/accounts";

interface AccountTypeSelectorProps {
  onSelect: (accountType: AccountType) => void;
  selectedType?: AccountType;
}

const accountTypes = [
  {
    type: 'GLEIF' as AccountType,
    title: 'GLEIF Root',
    description: 'Global Legal Entity Identifier Foundation - Root issuer',
    icon: Building,
    color: 'bg-blue-600',
    capabilities: ['Issue QVI Credentials']
  },
  {
    type: 'QVI' as AccountType,
    title: 'Qualified vLEI Issuer',
    description: 'Authorized to issue vLEI credentials to Legal Entities',
    icon: Key,
    color: 'bg-green-600',
    capabilities: ['Issue vLEI Credentials', 'Receive QVI Credentials']
  },
  {
    type: 'LE' as AccountType,
    title: 'Legal Entity',
    description: 'Legal entity that can authorize OOR and ECR credentials',
    icon: Users,
    color: 'bg-purple-600',
    capabilities: ['Issue Auth Credentials', 'Receive vLEI Credentials']
  },
  {
    type: 'LE-OOR' as AccountType,
    title: 'Legal Entity OOR',
    description: 'Individual in official capacity (e.g., CEO, Project Manager)',
    icon: UserCheck,
    color: 'bg-orange-600',
    capabilities: ['Receive OOR/ECR Credentials']
  }
];

export const AccountTypeSelector = ({ onSelect, selectedType }: AccountTypeSelectorProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Select Account Type
        </h3>
        <p className="text-slate-600">
          Choose the type of entity you represent in the vLEI ecosystem
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accountTypes.map((account) => {
          const IconComponent = account.icon;
          const isSelected = selectedType === account.type;
          
          return (
            <Card
              key={account.type}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50'
                  : 'hover:shadow-md hover:border-blue-200'
              }`}
              onClick={() => onSelect(account.type)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${account.color} rounded-lg flex items-center justify-center`}>
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {account.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-3">
                  {account.description}
                </CardDescription>
                <div className="space-y-1">
                  {account.capabilities.map((capability, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                      {capability}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

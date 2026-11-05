// types/protocol.ts

export enum TenancyStatus {
  DRAFT = 'DRAFT',
  DEPOSIT_PENDING = 'DEPOSIT_PENDING',
  DEPOSIT_LOCKED = 'DEPOSIT_LOCKED',
  REVIEW_PERIOD = 'REVIEW_PERIOD',
  DISPUTE_RESOLUTION = 'DISPUTE_RESOLUTION',
  SETTLED = 'SETTLED'
}

export interface YieldStrategy {
  id: string;
  name: 'Aave' | 'Morpho' | 'Compound';
  apy: number;
  riskScore: 'Low' | 'Medium' | 'High';
  contractAddress: string;
}

export interface TenancyState {
  id: string;
  tenantId: string;
  landlordId: string;
  status: TenancyStatus;
  depositAmount: number;
  selectedStrategy?: YieldStrategy;
  onChainVaultAddress?: string;
  lastUpdated: Date;
}
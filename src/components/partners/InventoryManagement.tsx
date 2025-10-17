'use client';

import React, { useState } from 'react';

interface IXTABox {
  id: string;
  type: 'Classic' | 'Pro' | 'Premium';
  serialNumber: string;
  status: 'available' | 'rented' | 'maintenance' | 'reserved';
  condition: 'excellent' | 'good' | 'fair';
}

interface StandInventory {
  standId: string;
  standName: string;
  location: string;
  isOperational: boolean;
  capacity: number;
  boxes: IXTABox[];
  lastUpdated: string;
}

const mockInventory: StandInventory[] = [
  {
    standId: 'stand-001',
    standName: 'Downtown Location A',
    location: 'Stockholm Central Station',
    isOperational: true,
    capacity: 15,
    lastUpdated: '2 hours ago',
    boxes: [
      { id: 'box-001', type: 'Classic', serialNumber: 'IXTA-CLS-001', status: 'available', condition: 'excellent' },
      { id: 'box-002', type: 'Classic', serialNumber: 'IXTA-CLS-002', status: 'rented', condition: 'good' },
      { id: 'box-003', type: 'Pro', serialNumber: 'IXTA-PRO-001', status: 'available', condition: 'excellent' },
      { id: 'box-004', type: 'Pro', serialNumber: 'IXTA-PRO-002', status: 'available', condition: 'excellent' },
      { id: 'box-005', type: 'Pro', serialNumber: 'IXTA-PRO-003', status: 'rented', condition: 'good' },
      { id: 'box-006', type: 'Premium', serialNumber: 'IXTA-PRM-001', status: 'available', condition: 'excellent' },
      { id: 'box-007', type: 'Classic', serialNumber: 'IXTA-CLS-003', status: 'maintenance', condition: 'fair' },
      { id: 'box-008', type: 'Pro', serialNumber: 'IXTA-PRO-004', status: 'reserved', condition: 'excellent' },
    ],
  },
  {
    standId: 'stand-002',
    standName: 'Airport Terminal B',
    location: 'Arlanda Airport, Terminal 5',
    isOperational: true,
    capacity: 20,
    lastUpdated: '1 hour ago',
    boxes: [
      { id: 'box-009', type: 'Classic', serialNumber: 'IXTA-CLS-004', status: 'available', condition: 'excellent' },
      { id: 'box-010', type: 'Classic', serialNumber: 'IXTA-CLS-005', status: 'available', condition: 'excellent' },
      { id: 'box-011', type: 'Pro', serialNumber: 'IXTA-PRO-005', status: 'rented', condition: 'excellent' },
      { id: 'box-012', type: 'Pro', serialNumber: 'IXTA-PRO-006', status: 'rented', condition: 'good' },
      { id: 'box-013', type: 'Premium', serialNumber: 'IXTA-PRM-002', status: 'available', condition: 'excellent' },
      { id: 'box-014', type: 'Premium', serialNumber: 'IXTA-PRM-003', status: 'available', condition: 'excellent' },
      { id: 'box-015', type: 'Classic', serialNumber: 'IXTA-CLS-006', status: 'rented', condition: 'good' },
      { id: 'box-016', type: 'Pro', serialNumber: 'IXTA-PRO-007', status: 'available', condition: 'excellent' },
      { id: 'box-017', type: 'Pro', serialNumber: 'IXTA-PRO-008', status: 'reserved', condition: 'excellent' },
    ],
  },
  {
    standId: 'stand-003',
    standName: 'Shopping Mall West',
    location: 'Gallerian Shopping Center',
    isOperational: true,
    capacity: 10,
    lastUpdated: '30 minutes ago',
    boxes: [
      { id: 'box-018', type: 'Classic', serialNumber: 'IXTA-CLS-007', status: 'available', condition: 'excellent' },
      { id: 'box-019', type: 'Classic', serialNumber: 'IXTA-CLS-008', status: 'rented', condition: 'good' },
      { id: 'box-020', type: 'Pro', serialNumber: 'IXTA-PRO-009', status: 'available', condition: 'excellent' },
      { id: 'box-021', type: 'Premium', serialNumber: 'IXTA-PRM-004', status: 'rented', condition: 'excellent' },
      { id: 'box-022', type: 'Classic', serialNumber: 'IXTA-CLS-009', status: 'maintenance', condition: 'fair' },
    ],
  },
];

export default function InventoryManagement() {
  const [selectedStand, setSelectedStand] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 text-green-400 border-green-400/40';
      case 'rented':
        return 'bg-blue-500/20 text-blue-400 border-blue-400/40';
      case 'maintenance':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/40';
      case 'reserved':
        return 'bg-purple-500/20 text-purple-400 border-purple-400/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/40';
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'bg-green-500/10 text-green-400';
      case 'good':
        return 'bg-blue-500/10 text-blue-400';
      case 'fair':
        return 'bg-yellow-500/10 text-yellow-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const calculateInventoryStats = () => {
    let totalBoxes = 0;
    let availableBoxes = 0;
    let rentedBoxes = 0;
    let maintenanceBoxes = 0;
    let reservedBoxes = 0;

    mockInventory.forEach((stand) => {
      totalBoxes += stand.boxes.length;
      stand.boxes.forEach((box) => {
        if (box.status === 'available') availableBoxes++;
        if (box.status === 'rented') rentedBoxes++;
        if (box.status === 'maintenance') maintenanceBoxes++;
        if (box.status === 'reserved') reservedBoxes++;
      });
    });

    return { totalBoxes, availableBoxes, rentedBoxes, maintenanceBoxes, reservedBoxes };
  };

  const stats = calculateInventoryStats();
  const selectedStandData = selectedStand
    ? mockInventory.find((s) => s.standId === selectedStand)
    : null;

  const filteredBoxes = selectedStandData
    ? selectedStandData.boxes.filter((box) =>
        filterStatus === 'all' ? true : box.status === filterStatus
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Inventory Overview with Background */}
      <div className="relative overflow-hidden border border-cyan-400/20 rounded-xl">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage: "url(/images/background/IXTAbox_-_IXTAbox_-_Taktaltarna_CLASSIC.jpg)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/90 to-gray-900/85" />
        
        <div className="relative p-6">
          <h2 className="text-2xl font-bold mb-4">Inventory Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total IXTAboxes</p>
              <p className="text-2xl font-bold text-cyan-300">{stats.totalBoxes}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Available</p>
              <p className="text-2xl font-bold text-green-400">{stats.availableBoxes}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Rented</p>
              <p className="text-2xl font-bold text-blue-400">{stats.rentedBoxes}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Reserved</p>
              <p className="text-2xl font-bold text-purple-400">{stats.reservedBoxes}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Maintenance</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.maintenanceBoxes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stand Selection and Inventory */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Stand Inventory Management</h2>
            <p className="text-sm text-gray-400 mt-1">
              Select a stand to view and manage its IXTAbox inventory
            </p>
          </div>
          <button className="px-4 py-2 bg-cyan-600/20 text-cyan-300 border border-cyan-400/40 rounded-md hover:bg-cyan-600/30 transition-colors text-sm font-medium">
            + Add IXTAbox
          </button>
        </div>

        {/* Stand Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Select Stand</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockInventory.map((stand) => {
              const availableCount = stand.boxes.filter((b) => b.status === 'available').length;
              const utilizationRate = Math.round(
                (stand.boxes.filter((b) => b.status === 'rented').length / stand.boxes.length) * 100
              );

              return (
                <button
                  key={stand.standId}
                  onClick={() => setSelectedStand(stand.standId)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    selectedStand === stand.standId
                      ? 'border-cyan-400/60 bg-cyan-500/10'
                      : 'border-white/10 bg-white/5 hover:border-cyan-400/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-cyan-300">{stand.standName}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        stand.isOperational
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {stand.isOperational ? 'Operational' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{stand.location}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Total Boxes</p>
                      <p className="font-semibold text-cyan-300">{stand.boxes.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Available</p>
                      <p className="font-semibold text-green-400">{availableCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Capacity</p>
                      <p className="font-semibold text-gray-300">{stand.capacity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Utilization</p>
                      <p className="font-semibold text-blue-400">{utilizationRate}%</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Stand Inventory Details */}
        {selectedStandData && (
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedStandData.standName} Inventory</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Last updated: {selectedStandData.lastUpdated}
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-white/10 bg-white/5 text-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
                >
                  <option value="all" className="bg-gray-800">All Status</option>
                  <option value="available" className="bg-gray-800">Available</option>
                  <option value="rented" className="bg-gray-800">Rented</option>
                  <option value="reserved" className="bg-gray-800">Reserved</option>
                  <option value="maintenance" className="bg-gray-800">Maintenance</option>
                </select>
                <button className="px-4 py-2 border border-white/10 text-gray-200 rounded-md hover:bg-white/5 transition-colors text-sm">
                  Export Report
                </button>
              </div>
            </div>

            {/* Box List */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">
                      Serial Number
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">
                      Type
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">
                      Condition
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-400 pb-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBoxes.map((box) => (
                    <tr
                      key={box.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <p className="text-sm font-medium text-gray-200">{box.serialNumber}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-cyan-300">{box.type}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusColor(
                            box.status
                          )}`}
                        >
                          {box.status.charAt(0).toUpperCase() + box.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${getConditionBadge(
                            box.condition
                          )}`}
                        >
                          {box.condition.charAt(0).toUpperCase() + box.condition.slice(1)}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button className="text-xs text-cyan-300 hover:text-cyan-200 transition-colors">
                            Edit
                          </button>
                          <button className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredBoxes.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No IXTAboxes found with the selected filter.
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedStandData && (
          <div className="text-center py-12 text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p>Select a stand above to view its inventory</p>
          </div>
        )}
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Alerts & Notifications</h2>
        <div className="space-y-3">
          <div className="bg-yellow-500/10 border border-yellow-400/20 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-300">
                  Low Availability at Shopping Mall West
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  Only 2 IXTAboxes available. Consider adding more inventory to meet demand.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-400/20 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-300">
                  Maintenance Required
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  2 IXTAboxes require maintenance. Schedule service to return them to inventory.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


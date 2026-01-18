'use client';

import React, { useState, useEffect } from 'react';

interface Location {
  id: string;
  display_id: string;
  name: string;
  address: string | null;
  status: string;
  stands_count?: number;
}

interface Stand {
  id: string;
  display_id: string;
  name: string;
  capacity: number;
  location_id: string;
  location_name?: string;
  boxes_count?: number;
}

interface Box {
  id: string;
  display_id: string;
  model: string;
  status: string;
  compartment: number | null;
  stand_id: string;
  stand_name?: string;
  location_name?: string;
}

interface Customer {
  id: string;
  display_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  total_bookings: number;
  total_spent: number;
  currency: string;
}

type TabType = 'locations' | 'stands' | 'boxes' | 'pricing' | 'customers';

interface PricingLocation {
  id: string;
  name: string;
}

interface PricingRule {
  id: string;
  week_from: number;
  week_to: number;
  price_per_day: number | string;
  model_type: string | null;
}

interface LocationApiData {
  id: string;
  displayId: string;
  name: string;
  address: string | null;
  status: string;
  stands?: Array<{ id: string }>;
}

interface StandApiData {
  id: string;
  display_id: string;
  name: string;
  capacity: number;
  location_id: string;
  locations?: { name: string };
  boxes?: Array<{ id: string }>;
}

interface BookingApiData {
  customerEmail: string;
  revenue?: number;
}

export default function AdminSection() {
  const [activeTab, setActiveTab] = useState<TabType>('locations');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Locations state
  const [locations, setLocations] = useState<Location[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({ name: '', address: '', status: 'Available' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  // Stands state
  const [stands, setStands] = useState<Stand[]>([]);
  const [showStandModal, setShowStandModal] = useState(false);
  const [editingStand, setEditingStand] = useState<Stand | null>(null);
  const [standForm, setStandForm] = useState({ name: '', capacity: 1, locationId: '' });
  
  // Boxes state
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [boxForm, setBoxForm] = useState({ model: 'Small', status: 'Active', compartment: '', standId: '' });
  
  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Pricing state
  const [allPricingData, setAllPricingData] = useState<Array<{ location: PricingLocation; pricing: PricingRule[] }>>([]);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<{ locationId: string; week: number } | null>(null);
  const [pricingForm, setPricingForm] = useState({ 
    weekFrom: '', 
    weekTo: '', 
    pricePerDay: '', 
    modelType: '' 
  });
  const [maxWeeks, setMaxWeeks] = useState(12);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'locations', label: 'Locations' },
    { id: 'stands', label: 'Stands' },
    { id: 'boxes', label: 'Boxes' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'customers', label: 'Customers' },
  ];

  const getAuthHeaders = () => {
    const authToken = localStorage.getItem('auth-token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  };

  // Fetch locations
  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/distributor/locations/map', { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      if (data.success) {
        setLocations(data.data.map((loc: LocationApiData) => ({
          id: loc.id,
          display_id: loc.displayId,
          name: loc.name,
          address: loc.address,
          status: loc.status,
          stands_count: loc.stands?.length || 0,
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stands
  const fetchStands = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/distributor/stands', { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch stands');
      const data = await response.json();
      if (data.success) {
        setStands(data.data.map((stand: StandApiData) => ({
          id: stand.id,
          display_id: stand.display_id,
          name: stand.name,
          capacity: stand.capacity,
          location_id: stand.location_id,
          location_name: stand.locations?.name,
          boxes_count: stand.boxes?.length || 0,
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stands');
    } finally {
      setLoading(false);
    }
  };

  // Fetch boxes
  const fetchBoxes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/distributor/admin/boxes', { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch boxes');
      const data = await response.json();
      if (data.success && data.data) {
        setBoxes(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch boxes');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all pricing data for all locations
  const fetchAllPricingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/distributor/admin/pricing', { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch pricing data');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setAllPricingData(data.data);
      } else {
        setAllPricingData([]);
      }
    } catch (err) {
      console.error('Error fetching pricing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pricing data');
      setAllPricingData([]);
    } finally {
      setLoading(false);
    }
  };

  // Get price for a specific location and week
  const getPriceForLocationWeek = (locationId: string, week: number): number | null => {
    const locationData = allPricingData.find(d => d.location.id === locationId);
    if (!locationData) return null;
    
    // Find pricing rule that covers this week
    for (const rule of locationData.pricing) {
      if (week >= rule.week_from && week <= rule.week_to) {
        return Number(rule.price_per_day);
      }
    }
    return null;
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // We'll need to create this endpoint or derive from bookings
      const response = await fetch('/api/distributor/bookings', { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      if (data.success) {
        // Aggregate customers from bookings
        const customerMap = new Map<string, Customer>();
        data.data.forEach((booking: BookingApiData) => {
          const key = booking.customerEmail;
          if (!customerMap.has(key)) {
            customerMap.set(key, {
              id: booking.customerEmail,
              display_id: booking.customerEmail.slice(0, 6),
              full_name: booking.customerEmail.split('@')[0],
              email: booking.customerEmail,
              phone: null,
              total_bookings: 0,
              total_spent: 0,
              currency: 'SEK',
            });
          }
          const customer = customerMap.get(key)!;
          customer.total_bookings += 1;
          customer.total_spent += booking.revenue || 0;
        });
        setCustomers(Array.from(customerMap.values()));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switch (activeTab) {
      case 'locations':
        fetchLocations();
        break;
      case 'stands':
        fetchStands();
        break;
        case 'boxes':
          fetchBoxes();
          fetchStands(); // Also fetch stands for box modal
          break;
      case 'pricing':
        fetchAllPricingData();
        break;
      case 'customers':
        fetchCustomers();
        break;
    }
  }, [activeTab]);

  const handleCreateLocation = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/distributor/admin/locations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(locationForm),
      });
      if (!response.ok) throw new Error('Failed to create location');
      await fetchLocations();
      setShowLocationModal(false);
      setLocationForm({ name: '', address: '', status: 'Available' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/distributor/admin/locations/${editingLocation.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(locationForm),
      });
      if (!response.ok) throw new Error('Failed to update location');
      await fetchLocations();
      setShowLocationModal(false);
      setEditingLocation(null);
      setLocationForm({ name: '', address: '', status: 'Available' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteLocationModal = (location: Location) => {
    setLocationToDelete(location);
    setDeleteConfirmation('');
    setShowDeleteModal(true);
  };

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;
    
    if (deleteConfirmation !== locationToDelete.name) {
      setError('Location name does not match. Please type the exact location name to confirm deletion.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/distributor/admin/locations/${locationToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete location');
      await fetchLocations();
      setShowDeleteModal(false);
      setLocationToDelete(null);
      setDeleteConfirmation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStand = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/distributor/admin/stands', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(standForm),
      });
      if (!response.ok) throw new Error('Failed to create stand');
      await fetchStands();
      setShowStandModal(false);
      setStandForm({ name: '', capacity: 1, locationId: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stand');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStand = async () => {
    if (!editingStand) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/distributor/admin/stands/${editingStand.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(standForm),
      });
      if (!response.ok) throw new Error('Failed to update stand');
      await fetchStands();
      setShowStandModal(false);
      setEditingStand(null);
      setStandForm({ name: '', capacity: 1, locationId: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stand');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStand = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stand? This will also delete all boxes.')) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/distributor/admin/stands/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete stand');
      await fetchStands();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete stand');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBox = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/distributor/admin/boxes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...boxForm,
          compartment: boxForm.compartment ? parseInt(boxForm.compartment) : null,
        }),
      });
      if (!response.ok) throw new Error('Failed to create box');
      await fetchBoxes();
      setShowBoxModal(false);
      setBoxForm({ model: 'Small', status: 'Active', compartment: '', standId: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create box');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBox = async () => {
    if (!editingBox) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/distributor/admin/boxes/${editingBox.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...boxForm,
          compartment: boxForm.compartment ? parseInt(boxForm.compartment) : null,
        }),
      });
      if (!response.ok) throw new Error('Failed to update box');
      await fetchBoxes();
      setShowBoxModal(false);
      setEditingBox(null);
      setBoxForm({ model: 'Small', status: 'Active', compartment: '', standId: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update box');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBox = async (id: string) => {
    if (!confirm('Are you sure you want to delete this box?')) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/distributor/admin/boxes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete box');
      await fetchBoxes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete box');
    } finally {
      setLoading(false);
    }
  };

  const openLocationModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm({ name: location.name, address: location.address || '', status: location.status });
    } else {
      setEditingLocation(null);
      setLocationForm({ name: '', address: '', status: 'Available' });
    }
    setShowLocationModal(true);
  };

  const openStandModal = (stand?: Stand) => {
    if (stand) {
      setEditingStand(stand);
      setStandForm({ name: stand.name, capacity: stand.capacity, locationId: stand.location_id });
    } else {
      setEditingStand(null);
      setStandForm({ name: '', capacity: 1, locationId: locations[0]?.id || '' });
    }
    setShowStandModal(true);
  };

  const openBoxModal = async (box?: Box) => {
    // Ensure stands are loaded before opening modal
    if (stands.length === 0) {
      await fetchStands();
    }
    
    if (box) {
      setEditingBox(box);
      setBoxForm({ 
        model: box.model, 
        status: box.status, 
        compartment: box.compartment?.toString() || '', 
        standId: box.stand_id 
      });
    } else {
      setEditingBox(null);
      setBoxForm({ model: 'Small', status: 'Active', compartment: '', standId: stands[0]?.id || '' });
    }
    setShowBoxModal(true);
  };

  const openPricingModal = (locationId: string, week: number) => {
    // Find existing pricing rule for this location and week, if any
    const locationData = allPricingData.find(d => d.location.id === locationId);
    const existingRule = locationData?.pricing.find(
      rule => week >= rule.week_from && week <= rule.week_to
    );

    if (existingRule) {
      setEditingPricing({ locationId, week });
      setPricingForm({
        weekFrom: existingRule.week_from.toString(),
        weekTo: existingRule.week_to.toString(),
        pricePerDay: existingRule.price_per_day.toString(),
        modelType: existingRule.model_type || '',
      });
    } else {
      setEditingPricing({ locationId, week });
      setPricingForm({
        weekFrom: week.toString(),
        weekTo: week.toString(),
        pricePerDay: '',
        modelType: '',
      });
    }
    setShowPricingModal(true);
  };

  const handleCreatePricing = async () => {
    if (!editingPricing) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/distributor/admin/pricing', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          locationId: editingPricing.locationId,
          weekFrom: pricingForm.weekFrom,
          weekTo: pricingForm.weekTo,
          pricePerDay: pricingForm.pricePerDay,
          modelType: pricingForm.modelType || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create pricing rule');
      }
      await fetchAllPricingData();
      setShowPricingModal(false);
      setEditingPricing(null);
      setPricingForm({ weekFrom: '', weekTo: '', pricePerDay: '', modelType: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pricing rule');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePricing = async () => {
    if (!editingPricing) return;

    // Find the existing pricing rule ID
    const locationData = allPricingData.find(d => d.location.id === editingPricing.locationId);
    const existingRule = locationData?.pricing.find(
      rule => editingPricing.week >= rule.week_from && editingPricing.week <= rule.week_to
    );

    if (!existingRule) {
      setError('Pricing rule not found. Please create a new rule instead.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/distributor/admin/pricing/${existingRule.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          weekFrom: pricingForm.weekFrom,
          weekTo: pricingForm.weekTo,
          pricePerDay: pricingForm.pricePerDay,
          modelType: pricingForm.modelType || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update pricing rule');
      }
      await fetchAllPricingData();
      setShowPricingModal(false);
      setEditingPricing(null);
      setPricingForm({ weekFrom: '', weekTo: '', pricePerDay: '', modelType: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pricing rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Enhanced Header */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 rounded-2xl blur-3xl"></div>
        <div className="relative bg-gray-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6 shadow-xl shadow-cyan-500/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-gray-400 text-sm">Manage your locations, stands, boxes, pricing, and customers</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="mb-6 relative">
        <div className="border-b border-gray-700/50 backdrop-blur-sm">
          <nav className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative inline-flex items-center px-4 py-3 text-sm font-medium transition-all duration-300 rounded-t-lg group ${
                    isActive
                      ? 'text-cyan-300'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {tab.label}
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
                    )}
                  </span>
                  {isActive && (
                    <>
                      {/* Background glow */}
                      <span className="absolute inset-0 bg-cyan-500/10 rounded-t-lg border-t border-x border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]" />
                      {/* Animated bottom border */}
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-3/4 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" />
                    </>
                  )}
                  <span className="absolute inset-0 bg-white/5 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
              <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-900/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Stands</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                  {locations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{location.display_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{location.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{location.address || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          location.status === 'available' || location.status === 'Available' || location.status === 'Active' || location.status === 'Occupied' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                          location.status === 'maintenance' || location.status === 'Maintenance' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {location.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{location.stands_count || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openLocationModal(location)}
                          className="text-cyan-400 hover:text-cyan-300 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteLocationModal(location)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {locations.length === 0 && (
                <div className="text-center py-8 text-gray-400">No locations found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stands Tab */}
      {activeTab === 'stands' && (
        <div>
          <div className="flex justify-end items-center mb-6">
            <button
              onClick={() => openStandModal()}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={locations.length === 0}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Stand
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
              <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-900/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Capacity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Boxes</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                  {stands.map((stand) => (
                    <tr key={stand.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{stand.display_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{stand.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{stand.location_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{stand.capacity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{stand.boxes_count || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openStandModal(stand)}
                          className="text-cyan-400 hover:text-cyan-300 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStand(stand.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stands.length === 0 && (
                <div className="text-center py-8 text-gray-400">No stands found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Boxes Tab */}
      {activeTab === 'boxes' && (
        <div>
          <div className="flex justify-end items-center mb-6">
            <button
              onClick={() => openBoxModal()}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={stands.length === 0}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Box
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
              <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-900/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Compartment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Stand</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                  {boxes.map((box) => (
                    <tr key={box.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{box.display_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{box.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          box.status === 'Active' || box.status === 'Available' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                          box.status === 'Maintenance' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {box.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{box.compartment || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{box.location_name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{box.stand_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openBoxModal(box)}
                          className="text-cyan-400 hover:text-cyan-300 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBox(box.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {boxes.length === 0 && (
                <div className="text-center py-8 text-gray-400">No boxes found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div>
          <div className="flex justify-end items-center mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-300 font-medium">Max Weeks:</label>
              <input
                type="number"
                min="1"
                max="52"
                value={maxWeeks}
                onChange={(e) => setMaxWeeks(parseInt(e.target.value) || 12)}
                className="w-24 px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-x-auto shadow-xl">
              <table className="min-w-full">
                <thead className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-900/95 backdrop-blur-sm z-20 border-r border-gray-700/50">
                      Location
                    </th>
                    {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((week) => (
                      <th
                        key={week}
                        className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider min-w-[100px] border-r border-gray-700 last:border-r-0"
                      >
                        Week {week}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                  {allPricingData.map((item) => (
                    <tr key={item.location.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-white font-medium sticky left-0 bg-gray-800/95 backdrop-blur-sm z-10 border-r border-gray-700/50 whitespace-nowrap">
                        {item.location.name}
                      </td>
                      {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((week) => {
                        const price = getPriceForLocationWeek(item.location.id, week);
                        return (
                          <td
                            key={week}
                            className="px-3 py-3 text-center text-sm border-r border-gray-700 last:border-r-0 cursor-pointer hover:bg-cyan-500/20 transition-colors"
                            onClick={() => openPricingModal(item.location.id, week)}
                          >
                            {price !== null ? (
                              <span className="text-white font-semibold">
                                {price.toLocaleString()} SEK
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {allPricingData.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-400">
                  <p className="mb-2">No locations found.</p>
                  <p className="text-sm">Add locations in the Locations tab to manage pricing.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
              <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-900/80 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{customer.display_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{customer.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{customer.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{customer.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{customer.total_bookings}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{customer.currency} {customer.total_spent.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length === 0 && (
                <div className="text-center py-8 text-gray-400">No customers found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingLocation ? 'Edit Location' : 'Create Location'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={locationForm.status}
                  onChange={(e) => setLocationForm({ ...locationForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="Available">Available</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingLocation ? handleUpdateLocation : handleCreateLocation}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                {editingLocation ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stand Modal */}
      {showStandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingStand ? 'Edit Stand' : 'Create Stand'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={standForm.name}
                  onChange={(e) => setStandForm({ ...standForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                <select
                  value={standForm.locationId}
                  onChange={(e) => setStandForm({ ...standForm, locationId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={standForm.capacity}
                  onChange={(e) => setStandForm({ ...standForm, capacity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowStandModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingStand ? handleUpdateStand : handleCreateStand}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                {editingStand ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Box Modal */}
      {showBoxModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingBox ? 'Edit Box' : 'Create Box'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Stand</label>
                <select
                  value={boxForm.standId}
                  onChange={(e) => setBoxForm({ ...boxForm, standId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Select Stand</option>
                  {stands.map((stand) => (
                    <option key={stand.id} value={stand.id}>{stand.name} ({stand.location_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                <select
                  value={boxForm.model}
                  onChange={(e) => setBoxForm({ ...boxForm, model: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                  <option value="XLarge">XLarge</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={boxForm.status}
                  onChange={(e) => setBoxForm({ ...boxForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Compartment (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={boxForm.compartment}
                  onChange={(e) => setBoxForm({ ...boxForm, compartment: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowBoxModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingBox ? handleUpdateBox : handleCreateBox}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                {editingBox ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingPricing ? 'Set Pricing' : 'Create Pricing Rule'}
            </h3>
            {editingPricing && (
              <p className="text-sm text-gray-400 mb-4">
                Location: {allPricingData.find(d => d.location.id === editingPricing.locationId)?.location.name || 'Unknown'} | Week: {editingPricing.week}
              </p>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Week From</label>
                <input
                  type="number"
                  min="1"
                  value={pricingForm.weekFrom}
                  onChange={(e) => setPricingForm({ ...pricingForm, weekFrom: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  placeholder="e.g., 1"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Starting week number (Week 1, Week 2, etc.)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Week To</label>
                <input
                  type="number"
                  min="1"
                  value={pricingForm.weekTo}
                  onChange={(e) => setPricingForm({ ...pricingForm, weekTo: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  placeholder="e.g., 4"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Ending week number (must be &gt;= Week From)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Price Per Day (SEK)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingForm.pricePerDay}
                  onChange={(e) => setPricingForm({ ...pricingForm, pricePerDay: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Model Type (optional)</label>
                <select
                  value={pricingForm.modelType}
                  onChange={(e) => setPricingForm({ ...pricingForm, modelType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">All Models</option>
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                  <option value="XLarge">XLarge</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Leave empty to apply to all box models</p>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowPricingModal(false);
                  setEditingPricing(null);
                  setPricingForm({ weekFrom: '', weekTo: '', pricePerDay: '', modelType: '' });
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingPricing ? handleUpdatePricing : handleCreatePricing}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                {editingPricing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Location Confirmation Modal */}
      {showDeleteModal && locationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Delete Location</h3>
              <p className="text-sm text-gray-400">
                This action cannot be undone. This will permanently delete the location <span className="text-white font-semibold">&quot;{locationToDelete.name}&quot;</span> and all associated stands and boxes.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type <span className="text-white font-semibold">&quot;{locationToDelete.name}&quot;</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => {
                  setDeleteConfirmation(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmation === locationToDelete.name) {
                    handleDeleteLocation();
                  }
                }}
                className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                placeholder={locationToDelete.name}
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setLocationToDelete(null);
                  setDeleteConfirmation('');
                  setError(null);
                }}
                className="px-5 py-2.5 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLocation}
                disabled={deleteConfirmation !== locationToDelete.name || loading}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-red-600 disabled:hover:to-red-700"
              >
                {loading ? 'Deleting...' : 'Delete Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

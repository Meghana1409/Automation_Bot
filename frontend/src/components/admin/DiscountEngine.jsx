import React, { useState } from 'react';
import {
  Percent,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Calculator,
  CheckCircle,
  AlertCircle,
  X,
  Tag,
  Clock,
  ArrowRight,
} from 'lucide-react';
import api from '../../services/api';

export default function DiscountEngine({ discounts, services, onRefresh }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    rule_type: 'first_order', // 'first_order', 'festival', 'service_bundle'
    discount_type: 'percentage', // 'percentage', 'fixed'
    discount_value: 20,
    min_cart_value: 500,
    start_date: '',
    end_date: '',
    applicable_service_ids: '',
    bundle_required_service_ids: '',
    is_active: true,
  });

  // Simulator State
  const [simCart, setSimCart] = useState([]);
  const [simIsFirstOrder, setSimIsFirstOrder] = useState(true);
  const [simCouponCode, setSimCouponCode] = useState('');
  const [simDate, setSimDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const filteredRules = discounts.filter((r) => {
    if (activeTab === 'ALL') return true;
    return r.rule_type === activeTab;
  });

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setFormData({
      code: '',
      title: '',
      description: '',
      rule_type: 'first_order',
      discount_type: 'percentage',
      discount_value: 20,
      min_cart_value: 500,
      start_date: '',
      end_date: '',
      applicable_service_ids: '',
      bundle_required_service_ids: '',
      is_active: true,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule) => {
    setEditingRule(rule);
    setFormData({
      code: rule.code,
      title: rule.title,
      description: rule.description || '',
      rule_type: rule.rule_type,
      discount_type: rule.discount_type,
      discount_value: rule.discount_value,
      min_cart_value: rule.min_cart_value || 0,
      start_date: rule.start_date || '',
      end_date: rule.end_date || '',
      applicable_service_ids: rule.applicable_service_ids || '',
      bundle_required_service_ids: rule.bundle_required_service_ids || '',
      is_active: rule.is_active,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.title.trim()) {
      setError('Promo code and title are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (editingRule) {
        await api.discounts.update(editingRule.id, formData);
      } else {
        await api.discounts.create(formData);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to save discount rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Delete discount rule "${code}"?`)) return;
    try {
      await api.discounts.delete(id);
      onRefresh();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete rule.');
    }
  };

  // Simulator helper: toggle service in simulation cart
  const toggleSimService = (serviceId) => {
    if (simCart.includes(serviceId)) {
      setSimCart(simCart.filter((id) => id !== serviceId));
    } else {
      setSimCart([...simCart, serviceId]);
    }
  };

  const handleRunSimulation = async () => {
    if (simCart.length === 0) {
      alert('Please select at least one salon service to simulate.');
      return;
    }

    setCalculating(true);
    try {
      const payload = {
        items: simCart.map((sid) => ({ service_id: sid, quantity: 1 })),
        is_first_order: simIsFirstOrder,
        coupon_code: simCouponCode.trim() || undefined,
        booking_date: simDate,
      };
      const result = await api.discounts.calculate(payload);
      setCalcResult(result);
    } catch (err) {
      alert(err.friendlyMessage || 'Simulation failed.');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Percent className="w-5 h-5 text-gold-500" />
            <span>Salon Offers & Beauty Packages Engine</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure first-visit client pamper discounts, festival glamour deals, and salon service combos.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-brand-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Salon Offer</span>
        </button>
      </div>

      {/* Main Split: Rules Catalog & Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Rules List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Rule Type Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: 'ALL', label: 'All Offers' },
              { id: 'first_order', label: 'First-Visit Offers' },
              { id: 'festival', label: 'Festival Glamour' },
              { id: 'service_bundle', label: 'Beauty Packages' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-brand-900 text-gold-300 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Rules Cards */}
          {filteredRules.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <Sparkles className="w-10 h-10 text-gold-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No salon offers found</p>
              <p className="text-xs text-slate-400 mt-1">
                Create a new promotional rule or beauty package to pamper salon clients.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRules.map((rule) => {
                const isBundle = rule.rule_type === 'service_bundle';
                const isFestival = rule.rule_type === 'festival';
                const isFirst = rule.rule_type === 'first_order';

                return (
                  <div
                    key={rule.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm bg-brand-50 text-brand-900 border border-brand-200 px-2.5 py-0.5 rounded-lg">
                          {rule.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isFirst
                              ? 'bg-gold-50 text-gold-800 border border-gold-200'
                              : isFestival
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isFirst
                            ? 'FIRST-VISIT PAMPER'
                            : isFestival
                            ? 'FESTIVAL GLAMOUR'
                            : 'BEAUTY PACKAGE'}
                        </span>
                        {!rule.is_active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            DISABLED
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{rule.title}</h3>
                      <p className="text-xs text-slate-500">{rule.description}</p>

                      <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                          {rule.discount_type === 'percentage'
                            ? `${rule.discount_value}% OFF`
                            : `₹${rule.discount_value} FLAT OFF`}
                        </span>

                        {rule.min_cart_value > 0 && (
                          <span>Min Spend: ₹{rule.min_cart_value}</span>
                        )}

                        {isFestival && (rule.start_date || rule.end_date) && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {rule.start_date || 'Any'} to {rule.end_date || 'Any'}
                          </span>
                        )}

                        {isBundle && rule.bundle_required_service_ids && (
                          <span className="inline-flex items-center gap-1 text-brand-700 font-medium">
                            <Layers className="w-3.5 h-3.5" />
                            Requires {rule.bundle_required_service_ids.split(',').length} bundled salon treatments
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenEditModal(rule)}
                        className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Offer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id, rule.code)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Discount Simulator & Cart Calculator */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-gold-500" />
              <span>Live Beauty Cart Simulator</span>
            </h3>
            <span className="text-[10px] bg-gold-50 text-gold-800 border border-gold-200 font-bold px-2 py-0.5 rounded-full">
              Test Beauty Cart
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Select salon services to verify how your promotional rules (first-visit pamper, festive glamour, and combos) calculate in real-time:
          </p>

          {/* Service Picker */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase">
              Select Salon Services in Cart:
            </label>
            {services.map((srv) => {
              const selected = simCart.includes(srv.id);
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => toggleSimService(srv.id)}
                  className={`w-full p-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                    selected
                      ? 'bg-brand-50 border-brand-400 text-brand-950 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="truncate pr-2">{srv.name}</span>
                  <span className="shrink-0 font-bold text-gold-600">₹{srv.price}</span>
                </button>
              );
            })}
          </div>

          {/* Client Parameters */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sim-first-order"
                checked={simIsFirstOrder}
                onChange={(e) => setSimIsFirstOrder(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="sim-first-order" className="text-xs font-semibold text-slate-700">
                First-Time Salon Client (First-Visit Pamper)
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Promo / Coupon Code (Optional):
              </label>
              <input
                type="text"
                value={simCouponCode}
                onChange={(e) => setSimCouponCode(e.target.value)}
                placeholder="e.g. LUXE-FIRST20"
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg uppercase focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Appointment Date (for Festival check):
              </label>
              <input
                type="date"
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={calculating || simCart.length === 0}
              className="w-full py-2 bg-brand-900 hover:bg-brand-950 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {calculating ? 'Evaluating...' : 'Run Discount Calculation'}
            </button>
          </div>

          {/* Results Display */}
          {calcResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">₹{calcResult.subtotal}</span>
              </div>
              <div className="flex justify-between text-brand-700 font-semibold">
                <span>Total Discount:</span>
                <span>-₹{calcResult.total_discount}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                <span>Final Payable:</span>
                <span className="text-gold-600">₹{calcResult.final_amount}</span>
              </div>

              {calcResult.applied_rules.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Applied Rules:</p>
                  {calcResult.applied_rules.map((ar, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] bg-white p-2 rounded-lg border border-slate-200/60 text-slate-700 flex justify-between"
                    >
                      <span className="font-medium">{ar.title}</span>
                      <span className="font-bold text-brand-700">-₹{ar.discount_amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-base text-slate-900">
                {editingRule ? 'Edit Salon Offer / Package' : 'Create New Salon Offer / Package'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {error}
                </div>
              )}

              {/* Code & Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Promo Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. GLOW-FESTIVE"
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Offer Type *</label>
                  <select
                    value={formData.rule_type}
                    onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 font-semibold"
                  >
                    <option value="first_order">First-Visit Pamper Offer</option>
                    <option value="festival">Festival Glamour Deal</option>
                    <option value="service_bundle">Beauty Package Combo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Luxury Festive Glow Package"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details of luxury treatment offer, qualification terms..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 font-bold"
                  />
                </div>
              </div>

              {/* Min Cart Subtotal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Minimum Cart Subtotal (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.min_cart_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_cart_value: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Festival specific date window */}
              {formData.rule_type === 'festival' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                      Valid From Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-purple-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                      Valid To Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-purple-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              )}

              {/* Bundle specific service picker */}
              {formData.rule_type === 'service_bundle' && (
                <div className="p-3 bg-brand-50/50 rounded-xl border border-brand-100 space-y-2">
                  <label className="block text-[11px] font-bold text-brand-950">
                    Required Salon Services for this Beauty Package:
                  </label>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {services.map((srv) => {
                      const curIds = formData.bundle_required_service_ids
                        ? formData.bundle_required_service_ids.split(',').map((x) => x.trim())
                        : [];
                      const isChecked = curIds.includes(String(srv.id));

                      const handleCheckbox = (checked) => {
                        let newIds = checked
                          ? [...curIds, String(srv.id)]
                          : curIds.filter((x) => x !== String(srv.id));
                        setFormData({
                          ...formData,
                          bundle_required_service_ids: newIds.join(','),
                        });
                      };

                      return (
                        <label
                          key={srv.id}
                          className="flex items-center gap-2 text-xs text-slate-700 bg-white p-1.5 rounded border border-brand-100 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckbox(e.target.checked)}
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                          <span className="font-medium truncate">{srv.name}</span>
                          <span className="text-[10px] text-gold-600 font-bold ml-auto">₹{srv.price}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rule-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="rule-active" className="text-xs font-semibold text-slate-700">
                  Active (Engine automatically considers this salon offer)
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs shadow-brand-500/20 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingRule ? 'Save Changes' : 'Create Salon Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

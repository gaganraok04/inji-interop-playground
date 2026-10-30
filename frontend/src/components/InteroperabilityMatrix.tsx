import React, { useState } from 'react';
import { InteropMatrixItem, IssuerOption, WalletOption, VerifierOption, CredentialFormat } from '../types';
import { Table, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface InteroperabilityMatrixProps {
  matrix: InteropMatrixItem[];
  onSelectRow: (config: {
    issuer: IssuerOption;
    wallet: WalletOption;
    verifier: VerifierOption;
    format: CredentialFormat;
  }) => void;
}

export const InteroperabilityMatrix: React.FC<InteroperabilityMatrixProps> = ({
  matrix,
  onSelectRow,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>('ALL');

  const filteredMatrix = matrix.filter((item) => {
    const matchesSearch =
      item.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.wallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.verifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.format.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.result.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFormat =
      selectedFormatFilter === 'ALL' || item.format === selectedFormatFilter;

    return matchesSearch && matchesFormat;
  });

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'VALID':
      case 'PASS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{result}</span>
          </span>
        );
      case 'INVALID':
      case 'FAIL':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            <span>{result}</span>
          </span>
        );
      case 'VALID BUT EXPIRED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>{result}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {result}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Table className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300">
              Interoperability Conformance Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cross-compatibility catalog of Issuer × Wallet × Verifier combinations
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          {/* Format Filter */}
          <select
            value={selectedFormatFilter}
            onChange={(e) => setSelectedFormatFilter(e.target.value)}
            className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">All Formats</option>
            <option value="W3C VC">W3C VC</option>
            <option value="SD-JWT VC">SD-JWT VC</option>
          </select>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search matrix..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Issuer</th>
              <th className="py-2.5 px-4 font-semibold">Wallet</th>
              <th className="py-2.5 px-4 font-semibold">Verifier</th>
              <th className="py-2.5 px-4 font-semibold">Format</th>
              <th className="py-2.5 px-4 font-semibold">Result</th>
              <th className="py-2.5 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
            {filteredMatrix.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No interoperability matrix records match your search filter.
                </td>
              </tr>
            ) : (
              filteredMatrix.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition-colors group cursor-pointer"
                  onClick={() =>
                    onSelectRow({
                      issuer: row.issuer as IssuerOption,
                      wallet: row.wallet as WalletOption,
                      verifier: row.verifier as VerifierOption,
                      format: row.format as CredentialFormat,
                    })
                  }
                >
                  <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {row.issuer}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    {row.wallet}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    {row.verifier}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {row.format}
                  </td>
                  <td className="py-2.5 px-4">
                    {getResultBadge(row.result)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      className="text-sky-600 dark:text-sky-400 hover:underline font-medium text-[11px] group-hover:opacity-100 opacity-60"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRow({
                          issuer: row.issuer as IssuerOption,
                          wallet: row.wallet as WalletOption,
                          verifier: row.verifier as VerifierOption,
                          format: row.format as CredentialFormat,
                        });
                      }}
                    >
                      Load Config
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1">
        <span>Showing {filteredMatrix.length} permutations</span>
        <span>Click any row to test that triad combination in the playground</span>
      </div>
    </div>
  );
};

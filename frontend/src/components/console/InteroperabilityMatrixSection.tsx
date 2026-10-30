import React, { useState } from 'react';
import { InteropMatrixItem, IssuerOption, WalletOption, VerifierOption, CredentialFormat } from '../../types';
import { Table, Search, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface InteroperabilityMatrixSectionProps {
  matrix: InteropMatrixItem[];
  onSelectRow: (config: {
    issuer: IssuerOption;
    wallet: WalletOption;
    verifier: VerifierOption;
    format: CredentialFormat;
  }) => void;
}

export const InteroperabilityMatrixSection: React.FC<InteroperabilityMatrixSectionProps> = ({
  matrix,
  onSelectRow,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredMatrix = matrix.filter((item) => {
    const matchesSearch =
      item.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.wallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.verifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.format.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.result.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFormat = formatFilter === 'ALL' || item.format === formatFilter;
    return matchesSearch && matchesFormat;
  });

  return (
    <div className="bg-cream border border-parchment-300 rounded-xl p-5 shadow-warm-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-parchment-200 pb-3">
        <div className="flex items-center space-x-2">
          <Table className="w-4 h-4 text-copper-700" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-parchment-900">
              Interoperability Conformance Matrix
            </h2>
            <p className="text-[11px] text-parchment-600">
              24-permutation catalog of Issuer × Wallet × Verifier combinations
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Format selector */}
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="text-xs bg-sand-50 border border-parchment-300 rounded-lg px-2.5 py-1.5 text-parchment-800 focus:outline-none focus:ring-1 focus:ring-copper-600 font-mono"
          >
            <option value="ALL">All Formats</option>
            <option value="W3C VC">W3C VC</option>
            <option value="SD-JWT VC">SD-JWT VC</option>
          </select>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-parchment-500" />
            <input
              type="text"
              placeholder="Filter matrix..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-sand-50 border border-parchment-300 rounded-lg text-parchment-800 placeholder-parchment-400 focus:outline-none focus:ring-1 focus:ring-copper-600 w-36 sm:w-48"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-parchment-300 bg-sand-50 hover:bg-sand-100 text-parchment-700"
            title={isExpanded ? 'Collapse Matrix' : 'Expand Matrix'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-x-auto rounded-lg border border-parchment-300">
          <table className="w-full text-left text-xs">
            <thead className="bg-sand-100 text-parchment-700 font-mono text-[10px] uppercase tracking-wider border-b border-parchment-300">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold">Issuer</th>
                <th className="py-2.5 px-3.5 font-semibold">Wallet</th>
                <th className="py-2.5 px-3.5 font-semibold">Verifier</th>
                <th className="py-2.5 px-3.5 font-semibold">Format</th>
                <th className="py-2.5 px-3.5 font-semibold">Result</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-parchment-200">
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-parchment-500 text-xs">
                    No matrix rows match your filter.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      onSelectRow({
                        issuer: row.issuer as IssuerOption,
                        wallet: row.wallet as WalletOption,
                        verifier: row.verifier as VerifierOption,
                        format: row.format as CredentialFormat,
                      })
                    }
                    className="hover:bg-copper-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3.5 font-semibold text-parchment-900">{row.issuer}</td>
                    <td className="py-2 px-3.5 text-parchment-700">{row.wallet}</td>
                    <td className="py-2 px-3.5 text-parchment-700">{row.verifier}</td>
                    <td className="py-2 px-3.5 font-mono text-copper-800">{row.format}</td>
                    <td className="py-2 px-3.5">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{row.result}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3.5 text-right">
                      <button
                        type="button"
                        className="text-copper-700 hover:text-copper-900 font-semibold text-[11px] hover:underline"
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
      )}
    </div>
  );
};

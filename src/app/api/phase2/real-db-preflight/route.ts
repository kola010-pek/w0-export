// Phase 2.2A: GET /api/phase2/real-db-preflight
// Real database read-only preflight check.
// When path is not configured, returns safe BLOCK response (no server error).

import { NextResponse } from 'next/server';
import {
  buildPhase2Response,
  isRealReadonlyMode,
} from '@/lib/data-source';
import {
  establishReadOnlyConnection,
  probeSchema,
  verifyWriteRejection,
  closeRealConnection,
} from '@/lib/real-db-connector';
import type { SchemaProbeResult } from '@/lib/real-db-connector';

interface PreflightData {
  configuration: {
    data_source_mode: string;
    data_source_kind: string;
    real_db_path_configured: boolean;
  };
  connection: {
    status: 'not_configured' | 'connected' | 'failed';
    readonly_connection: boolean;
    query_only: boolean;
    quick_check: boolean;
    write_rejection_verified: boolean;
    write_rejection_methods: string[];
  };
  identity: {
    database_fingerprint: string;
    database_size_bytes: number;
    database_last_modified: string;
    database_path_exposed: false;
  } | null;
  schema_probe: {
    probed: boolean;
    tables: SchemaProbeResult[];
    summary: {
      total_candidates: number;
      detected_count: number;
      missing_count: number;
      incomplete_count: number;
      all_required_present: boolean;
    };
  };
  safety: {
    production_write_enabled: false;
    production_model_enabled: false;
    production_release_enabled: false;
    sql_input_accepted: false;
    db_path_selectable: false;
    auto_migration_disabled: true;
    auto_fill_disabled: true;
  };
}

function buildNotConfiguredPreflight(): PreflightData {
  return {
    configuration: {
      data_source_mode: 'real_readonly',
      data_source_kind: 'production_database_readonly',
      real_db_path_configured: false,
    },
    connection: {
      status: 'not_configured',
      readonly_connection: false,
      query_only: false,
      quick_check: false,
      write_rejection_verified: false,
      write_rejection_methods: [],
    },
    identity: null,
    schema_probe: {
      probed: false,
      tables: [],
      summary: {
        total_candidates: 5,
        detected_count: 0,
        missing_count: 5,
        incomplete_count: 0,
        all_required_present: false,
      },
    },
    safety: {
      production_write_enabled: false,
      production_model_enabled: false,
      production_release_enabled: false,
      sql_input_accepted: false,
      db_path_selectable: false,
      auto_migration_disabled: true,
      auto_fill_disabled: true,
    },
  };
}

export async function GET() {
  try {
    // If not in real_readonly mode, return safe BLOCK with production_database_readonly identity
    if (!isRealReadonlyMode()) {
      const data = buildNotConfiguredPreflight();
      return NextResponse.json(
        buildPhase2Response({
          data,
          source: 'real_db_preflight',
          evidencePrefix: 'preflight',
          gateStatus: 'BLOCK',
          extra: {
            service_health: 'BLOCK',
            readiness: 'BLOCK',
            release_eligibility: 'BLOCK',
            block_reasons: ['real_db_path_not_configured'],
          },
        })
      );
    }

    // Establish read-only connection
    const connResult = establishReadOnlyConnection();

    if (!connResult.success || !connResult.db) {
      // Connection failed - return BLOCK with reasons
      const data = buildNotConfiguredPreflight();
      data.configuration.real_db_path_configured = true; // Path is configured but connection failed
      data.connection.status = 'failed';

      return NextResponse.json(
        buildPhase2Response({
          data,
          source: 'real_db_preflight',
          evidencePrefix: 'preflight',
          gateStatus: 'BLOCK',
          extra: {
            service_health: 'BLOCK',
            readiness: 'BLOCK',
            release_eligibility: 'BLOCK',
            block_reasons: connResult.block_reasons,
          },
        })
      );
    }

    // Connection successful - probe schema
    const db = connResult.db;
    const identity = connResult.identity!;

    // Schema probe
    const schemaResults = probeSchema(db);
    const detectedCount = schemaResults.filter(r => r.exists).length;
    const missingCount = schemaResults.filter(r => r.schema_status === 'missing').length;
    const incompleteCount = schemaResults.filter(r => r.schema_status === 'incomplete' || r.schema_status === 'unrecognized').length;
    const allRequiredPresent = schemaResults.every(r => r.required_columns_present);

    // Write rejection verification
    const writeRejection = verifyWriteRejection(db);

    // Determine gate status based on schema probe
    let gateStatus: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
    const warnings: string[] = [];

    if (!allRequiredPresent) {
      gateStatus = 'BLOCK';
      warnings.push('required_columns_missing_in_some_tables');
    }

    if (detectedCount === 0) {
      gateStatus = 'BLOCK';
      warnings.push('no_candidate_tables_detected');
    }

    if (missingCount > 0) {
      warnings.push(`${missingCount}_candidate_tables_missing`);
    }

    if (incompleteCount > 0) {
      if (gateStatus !== 'BLOCK') {
        gateStatus = 'WARN';
      }
      warnings.push(`${incompleteCount}_tables_with_incomplete_schema`);
    }

    if (!writeRejection.write_rejection_verified) {
      gateStatus = 'BLOCK';
      warnings.push('write_rejection_not_verified');
    }

    // Close connection after probe
    closeRealConnection(db);

    const data: PreflightData = {
      configuration: {
        data_source_mode: 'real_readonly',
        data_source_kind: 'production_database_readonly',
        real_db_path_configured: true,
      },
      connection: {
        status: 'connected',
        readonly_connection: identity.readonly_connection,
        query_only: identity.query_only,
        quick_check: identity.quick_check,
        write_rejection_verified: writeRejection.write_rejection_verified,
        write_rejection_methods: writeRejection.methods,
      },
      identity: {
        database_fingerprint: identity.database_fingerprint,
        database_size_bytes: identity.database_size_bytes,
        database_last_modified: identity.database_last_modified,
        database_path_exposed: false,
      },
      schema_probe: {
        probed: true,
        tables: schemaResults,
        summary: {
          total_candidates: schemaResults.length,
          detected_count: detectedCount,
          missing_count: missingCount,
          incomplete_count: incompleteCount,
          all_required_present: allRequiredPresent,
        },
      },
      safety: {
        production_write_enabled: false,
        production_model_enabled: false,
        production_release_enabled: false,
        sql_input_accepted: false,
        db_path_selectable: false,
        auto_migration_disabled: true,
        auto_fill_disabled: true,
      },
    };

    return NextResponse.json(
      buildPhase2Response({
        data,
        source: 'real_db_preflight',
        evidencePrefix: 'preflight',
        gateStatus,
        warnings: warnings.length > 0 ? warnings : undefined,
        extra: {
          service_health: gateStatus,
          readiness: gateStatus,
          release_eligibility: 'BLOCK', // Always BLOCK in Phase 2.2A
        },
      })
    );
  } catch (error) {
    // Any unexpected error -> BLOCK, never degrade to PASS
    const data = buildNotConfiguredPreflight();
    return NextResponse.json(
      buildPhase2Response({
        data,
        source: 'real_db_preflight',
        evidencePrefix: 'preflight',
        gateStatus: 'BLOCK',
        extra: {
          service_health: 'BLOCK',
          readiness: 'BLOCK',
          release_eligibility: 'BLOCK',
          block_reasons: ['preflight_unexpected_error'],
        },
      })
    );
  }
}

package com.joao_v_marques.dashboard_esg.wastes.waste_record;

import com.joao_v_marques.dashboard_esg.wastes.waste_record.dto.WasteRecordResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class WasteRecordService {

    private final WasteRecordRepository wasteRecordRepository;

    public WasteRecordService(WasteRecordRepository wasteRecordRepository) {
        this.wasteRecordRepository = wasteRecordRepository;
    }

    @Transactional(readOnly = true)
    public List<WasteRecordResponse> findAll() {
        return wasteRecordRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private WasteRecordResponse toResponse(WasteRecord wasteRecord) {
        return new WasteRecordResponse(
                wasteRecord.getId(),
                wasteRecord.getRecordDate(),
                wasteRecord.getUnit().getName(),
                wasteRecord.getWasteType().getName(),
                wasteRecord.getWeightKg(),
                wasteRecord.getObservations(),
                wasteRecord.getInsertedBy().getName(),
                wasteRecord.getCreatedAt(),
                wasteRecord.getUpdatedAt(),
                wasteRecord.getUpdatedBy().getName()
        );
    }
}

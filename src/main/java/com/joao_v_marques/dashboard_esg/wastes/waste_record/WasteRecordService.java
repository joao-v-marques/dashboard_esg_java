package com.joao_v_marques.dashboard_esg.wastes.waste_record;

import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.shared.units.Unit;
import com.joao_v_marques.dashboard_esg.shared.units.UnitRepository;
import com.joao_v_marques.dashboard_esg.users.user.User;
import com.joao_v_marques.dashboard_esg.users.user.UserRepository;
import com.joao_v_marques.dashboard_esg.wastes.waste_record.dto.WasteRecordRequest;
import com.joao_v_marques.dashboard_esg.wastes.waste_record.dto.WasteRecordResponse;
import com.joao_v_marques.dashboard_esg.wastes.waste_type.WasteType;
import com.joao_v_marques.dashboard_esg.wastes.waste_type.WasteTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class WasteRecordService {

    private final WasteRecordRepository wasteRecordRepository;
    private final UnitRepository unitRepository;
    private final WasteTypeRepository wasteTypeRepository;
    private final UserRepository userRepository;

    public WasteRecordService(WasteRecordRepository wasteRecordRepository, UnitRepository unitRepository, WasteTypeRepository wasteTypeRepository, UserRepository userRepository) {
        this.wasteRecordRepository = wasteRecordRepository;
        this.unitRepository = unitRepository;
        this.wasteTypeRepository = wasteTypeRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<WasteRecordResponse> findAll() {
        return wasteRecordRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public WasteRecordResponse create(WasteRecordRequest request, UserPrincipal currentUser) {
        String observations = request.observations() != null ? request.observations().trim() : null;

        // Validação das FK
        Unit unit = unitRepository.findById(request.unitId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhuma unidade com o ID informado."));
        WasteType wasteType = wasteTypeRepository.findById(request.wasteTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado tipo de resíduo com o ID informado."));
        User insertedBy = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado usuário com o ID informado."));

        // Transformar a DTO de request em entidade
        WasteRecord wasteRecord = new WasteRecord();
        wasteRecord.setRecordDate(request.recordDate());
        wasteRecord.setUnit(unit);
        wasteRecord.setWasteType(wasteType);
        wasteRecord.setWeightKg(request.weightKg());
        wasteRecord.setObservations(observations);
        wasteRecord.setInsertedBy(insertedBy);

        wasteRecordRepository.save(wasteRecord);

        return toResponse(wasteRecord);
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
                wasteRecord.getUpdatedBy() != null ? wasteRecord.getUpdatedBy().getName() : null
        );
    }
}

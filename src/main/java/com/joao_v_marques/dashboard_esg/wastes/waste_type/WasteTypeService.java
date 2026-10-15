package com.joao_v_marques.dashboard_esg.wastes.waste_type;

import com.joao_v_marques.dashboard_esg.wastes.waste_type.dto.WasteTypeResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class WasteTypeService {

    private final WasteTypeRepository wasteTypeRepository;

    public WasteTypeService(WasteTypeRepository wasteTypeRepository) {
        this.wasteTypeRepository = wasteTypeRepository;
    }

    @Transactional
    public List<WasteTypeResponse> findAll() {
        return wasteTypeRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private WasteTypeResponse toResponse(WasteType wasteType) {
        return new WasteTypeResponse(
                wasteType.getId(),
                wasteType.getName(),
                wasteType.getCode(),
                wasteType.isRecyclable(),
                wasteType.getCreatedAt()
        );
    }
}

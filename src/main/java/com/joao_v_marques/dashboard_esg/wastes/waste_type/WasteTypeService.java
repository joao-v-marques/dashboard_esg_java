package com.joao_v_marques.dashboard_esg.wastes.waste_type;

import com.joao_v_marques.dashboard_esg.wastes.waste_type.dto.WasteTypeRequest;
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

    @Transactional
    public WasteTypeResponse create(WasteTypeRequest request) {
        String name = request.name().trim();
        String code = request.code().trim();

        // Transformar a DTO em entidade
        WasteType wasteType = new WasteType();
        wasteType.setName(name);
        wasteType.setCode(code);
        wasteType.setRecyclable(request.isRecyclable());

        // Realizar a inserção no banco
        wasteTypeRepository.save(wasteType);

        return toResponse(wasteType);
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

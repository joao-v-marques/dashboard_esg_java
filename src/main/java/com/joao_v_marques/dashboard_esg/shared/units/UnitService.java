package com.joao_v_marques.dashboard_esg.shared.units;

import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.shared.units.dto.UnitRequest;
import com.joao_v_marques.dashboard_esg.shared.units.dto.UnitResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UnitService {

    private final UnitRepository unitRepository;

    public UnitService(UnitRepository unitRepository) {
        this.unitRepository = unitRepository;
    }

    @Transactional
    public List<UnitResponse> findAll() {
        return unitRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UnitResponse create(UnitRequest request) {
        String name = request.name().trim();
        String code = request.code().trim();

        // Transformar a DTO em entidade
        Unit unit = new Unit();
        unit.setName(name);
        unit.setCode(code);

        // Realizar a inserção no banco
        unitRepository.save(unit);

        return toResponse(unit);
    }

    @Transactional
    public UnitResponse update(Integer id, UnitRequest request) {
        String name = request.name().trim();
        String code = request.code().trim();

        // Confirmar se a Unit que passou realmente existe
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma unidade com o ID informado."));

        unit.setName(name);
        unit.setCode(code);

        return toResponse(unit);
    }

    private UnitResponse toResponse(Unit unit) {
        return new UnitResponse(
                unit.getId(),
                unit.getName(),
                unit.getCode(),
                unit.getCreatedAt()
        );
    }
}

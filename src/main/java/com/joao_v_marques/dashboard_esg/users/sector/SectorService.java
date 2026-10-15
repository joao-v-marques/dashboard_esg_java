package com.joao_v_marques.dashboard_esg.users.sector;

import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.users.sector.dto.SectorRequest;
import com.joao_v_marques.dashboard_esg.users.sector.dto.SectorResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SectorService {

    private final SectorRepository sectorRepository;

    public SectorService(SectorRepository sectorRepository) {
        this.sectorRepository = sectorRepository;
    }

    // GET de todos os setores cadastrados
    @Transactional(readOnly = true)
    public List<SectorResponse> findAll() {
        return sectorRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SectorResponse create(SectorRequest request) {
        String name = request.name().trim();

        if (sectorRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("O setor que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        Sector sector = new Sector();
        sector.setName(name);

        Sector saved = sectorRepository.save(sector);

        return toResponse(saved);
    }

    @Transactional
    public SectorResponse update(Integer sectorId, SectorRequest request) {
        String name = request.name().trim();

        // Valida se o setor editado realmente existe
        Sector sector = sectorRepository.findById(sectorId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum setor com o ID fornecido."));

        // Validações que a DTO não cobre
        if (!sector.isActive()) {
            throw new IllegalArgumentException("Não é possível editar uma ocorrência inativa.");
        }

        if (sectorRepository.existsByNameIgnoreCaseAndIdNot(name, sectorId)) {
            throw new ConflictException("Já existe outro setor cadastrado com este nome");
        }

        // Atualizar a entidade já existente
        sector.setName(name);

        return toResponse(sector);
    }

    @Transactional
    public SectorResponse deactivate(Integer sectorId) {
        // Valida se o setor desativado realmente existe
        Sector sector = sectorRepository.findById(sectorId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum setor com o ID fornecido."));

        if (!sector.isActive()) {
            throw new IllegalArgumentException("Este setor já está inativo.");
        }

        sector.setActive(false);

        return toResponse(sector);
    }

    @Transactional
    public SectorResponse reactivate(Integer sectorId) {
        // Valida se o setor reativado realmente existe
        Sector sector = sectorRepository.findById(sectorId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum setor com o ID fornecido."));

        if (sector.isActive()) {
            throw new IllegalArgumentException("Este setor já está ativo.");
        }

        sector.setActive(true);

        return toResponse(sector);
    }

    private SectorResponse toResponse(Sector sector) {
        return new SectorResponse(
                sector.getId(),
                sector.getName(),
                sector.isActive()
        );
    }
}

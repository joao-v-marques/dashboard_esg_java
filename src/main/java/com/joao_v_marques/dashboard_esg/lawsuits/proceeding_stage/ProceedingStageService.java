package com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage;

import com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage.dto.ProceedingStageRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage.dto.ProceedingStageResponse;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProceedingStageService {

    private final ProceedingStageRepository proceedingStageRepository;

    public ProceedingStageService(ProceedingStageRepository proceedingStageRepository) {
        this.proceedingStageRepository = proceedingStageRepository;
    }

    // GET de todos os trâmites cadastrados
    @Transactional(readOnly = true)
    public List<ProceedingStageResponse> findAll() {
        return proceedingStageRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProceedingStageResponse create(ProceedingStageRequest request) {
        String name = request.name().trim();

        if (proceedingStageRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("O trâmite que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        ProceedingStage proceedingStage = new ProceedingStage();
        proceedingStage.setName(name);

        ProceedingStage saved = proceedingStageRepository.save(proceedingStage);

        return toResponse(saved);
    }

    @Transactional
    public ProceedingStageResponse update(Integer proceedingStageId, ProceedingStageRequest request) {
        String name = request.name().trim();

        // Valida se o trâmite editado realmente existe
        ProceedingStage proceedingStage = proceedingStageRepository.findById(proceedingStageId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum trâmite com o ID fornecido."));

        // Validações que a DTO não cobre
        if (!proceedingStage.isActive()) {
            throw new IllegalArgumentException("Não é possível editar uma ocorrência inativa.");
        }

        if (proceedingStageRepository.existsByNameIgnoreCaseAndIdNot(name, proceedingStageId)) {
            throw new ConflictException("Já existe outro trâmite cadastrado com este nome");
        }

        // Atualizar a entidade já existente
        proceedingStage.setName(name);

        return toResponse(proceedingStage);
    }

    @Transactional
    public ProceedingStageResponse deactivate(Integer proceedingStageId) {
        // Valida se o trâmite desativado realmente existe
        ProceedingStage proceedingStage = proceedingStageRepository.findById(proceedingStageId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum trâmite com o ID fornecido."));

        if (!proceedingStage.isActive()) {
            throw new IllegalArgumentException("Este trâmite já está inativo.");
        }

        proceedingStage.setActive(false);

        return toResponse(proceedingStage);
    }

    @Transactional
    public ProceedingStageResponse reactivate(Integer proceedingStageId) {
        // Valida se o trâmite reativado realmente existe
        ProceedingStage proceedingStage = proceedingStageRepository.findById(proceedingStageId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum trâmite com o ID fornecido."));

        if (proceedingStage.isActive()) {
            throw new IllegalArgumentException("Este trâmite já está ativo.");
        }

        proceedingStage.setActive(true);

        return toResponse(proceedingStage);
    }

    private ProceedingStageResponse toResponse(ProceedingStage proceedingStage) {
        return new ProceedingStageResponse(
                proceedingStage.getId(),
                proceedingStage.getName(),
                proceedingStage.isActive()
        );
    }
}

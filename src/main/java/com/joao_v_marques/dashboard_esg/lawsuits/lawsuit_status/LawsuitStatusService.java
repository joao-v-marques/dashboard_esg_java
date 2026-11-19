package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.dto.LawsuitStatusRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.dto.LawsuitStatusResponse;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LawsuitStatusService {

    private final LawsuitStatusRepository lawsuitStatusRepository;

    public LawsuitStatusService(LawsuitStatusRepository lawsuitStatusRepository) {
        this.lawsuitStatusRepository = lawsuitStatusRepository;
    }

    // GET de todos os status de processo cadastrados
    @Transactional(readOnly = true)
    public List<LawsuitStatusResponse> findAll() {
        return lawsuitStatusRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LawsuitStatusResponse create(LawsuitStatusRequest request) {
        String name = request.name().trim();

        if (lawsuitStatusRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("O status de processo que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        LawsuitStatus lawsuitStatus = new LawsuitStatus();
        lawsuitStatus.setName(name);

        LawsuitStatus saved = lawsuitStatusRepository.save(lawsuitStatus);

        return toResponse(saved);
    }

    @Transactional
    public LawsuitStatusResponse update(Integer lawsuitStatusId, LawsuitStatusRequest request) {
        String name = request.name().trim();

        // Valida se o status editado realmente existe
        LawsuitStatus lawsuitStatus = lawsuitStatusRepository.findById(lawsuitStatusId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum status de processo com o ID fornecido."));

        // Validações que a DTO não cobre
        if (!lawsuitStatus.isActive()) {
            throw new IllegalArgumentException("Não é possível editar uma ocorrência inativa.");
        }

        if (lawsuitStatusRepository.existsByNameIgnoreCaseAndIdNot(name, lawsuitStatusId)) {
            throw new ConflictException("Já existe outro status de processo cadastrado com este nome");
        }

        // Atualizar a entidade já existente
        lawsuitStatus.setName(name);

        return toResponse(lawsuitStatus);
    }

    @Transactional
    public LawsuitStatusResponse deactivate(Integer lawsuitStatusId) {
        // Valida se o status desativado realmente existe
        LawsuitStatus lawsuitStatus = lawsuitStatusRepository.findById(lawsuitStatusId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum status de processo com o ID fornecido."));

        if (!lawsuitStatus.isActive()) {
            throw new IllegalArgumentException("Este status de processo já está inativo.");
        }

        lawsuitStatus.setActive(false);

        return toResponse(lawsuitStatus);
    }

    @Transactional
    public LawsuitStatusResponse reactivate(Integer lawsuitStatusId) {
        // Valida se o status reativado realmente existe
        LawsuitStatus lawsuitStatus = lawsuitStatusRepository.findById(lawsuitStatusId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum status de processo com o ID fornecido."));

        if (lawsuitStatus.isActive()) {
            throw new IllegalArgumentException("Este status de processo já está ativo.");
        }

        lawsuitStatus.setActive(true);

        return toResponse(lawsuitStatus);
    }

    private LawsuitStatusResponse toResponse(LawsuitStatus lawsuitStatus) {
        return new LawsuitStatusResponse(
                lawsuitStatus.getId(),
                lawsuitStatus.getName(),
                lawsuitStatus.isActive()
        );
    }
}

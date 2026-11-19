package com.joao_v_marques.dashboard_esg.lawsuits.loss_probability;

import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.dto.LossProbabilityRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.dto.LossProbabilityResponse;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LossProbabilityService {

    private final LossProbabilityRepository lossProbabilityRepository;

    public LossProbabilityService(LossProbabilityRepository lossProbabilityRepository) {
        this.lossProbabilityRepository = lossProbabilityRepository;
    }

    // GET de todas as probabilidades de perda cadastradas
    @Transactional(readOnly = true)
    public List<LossProbabilityResponse> findAll() {
        return lossProbabilityRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LossProbabilityResponse create(LossProbabilityRequest request) {
        String name = request.name().trim();

        if (lossProbabilityRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A probabilidade de perda que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        LossProbability lossProbability = new LossProbability();
        lossProbability.setName(name);

        LossProbability saved = lossProbabilityRepository.save(lossProbability);

        return toResponse(saved);
    }

    @Transactional
    public LossProbabilityResponse update(Integer lossProbabilityId, LossProbabilityRequest request) {
        String name = request.name().trim();

        // Valida se a probabilidade editada realmente existe
        LossProbability lossProbability = lossProbabilityRepository.findById(lossProbabilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma probabilidade de perda com o ID fornecido."));

        // Validações que a DTO não cobre
        if (!lossProbability.isActive()) {
            throw new IllegalArgumentException("Não é possível editar uma ocorrência inativa.");
        }

        if (lossProbabilityRepository.existsByNameIgnoreCaseAndIdNot(name, lossProbabilityId)) {
            throw new ConflictException("Já existe outra probabilidade de perda cadastrada com este nome");
        }

        // Atualizar a entidade já existente
        lossProbability.setName(name);

        return toResponse(lossProbability);
    }

    @Transactional
    public LossProbabilityResponse deactivate(Integer lossProbabilityId) {
        // Valida se a probabilidade desativada realmente existe
        LossProbability lossProbability = lossProbabilityRepository.findById(lossProbabilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma probabilidade de perda com o ID fornecido."));

        if (!lossProbability.isActive()) {
            throw new IllegalArgumentException("Esta probabilidade de perda já está inativa.");
        }

        lossProbability.setActive(false);

        return toResponse(lossProbability);
    }

    @Transactional
    public LossProbabilityResponse reactivate(Integer lossProbabilityId) {
        // Valida se a probabilidade reativada realmente existe
        LossProbability lossProbability = lossProbabilityRepository.findById(lossProbabilityId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma probabilidade de perda com o ID fornecido."));

        if (lossProbability.isActive()) {
            throw new IllegalArgumentException("Esta probabilidade de perda já está ativa.");
        }

        lossProbability.setActive(true);

        return toResponse(lossProbability);
    }

    private LossProbabilityResponse toResponse(LossProbability lossProbability) {
        return new LossProbabilityResponse(
                lossProbability.getId(),
                lossProbability.getName(),
                lossProbability.isActive()
        );
    }
}
